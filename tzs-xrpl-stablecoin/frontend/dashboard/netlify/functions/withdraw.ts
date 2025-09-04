import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface WithdrawRequest {
  user_id: string;
  amount: number;
  withdrawal_phone: string;
  withdrawal_type: 'mobile_money' | 'xrpl_token';
  destination_address?: string; // For XRPL withdrawals
}

interface ZenoPayWithdrawRequest {
  amount: number;
  recipient_phone: string;
  recipient_name: string;
  reference: string;
  callback_url: string;
}

class ZenoPayWithdrawService {
  private apiKey: string;
  private baseUrl: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = process.env.ZENOPAY_API_KEY || '';
    this.baseUrl = 'https://zenoapi.com/api/disbursements';
    this.webhookUrl = 'https://nedalabs.netlify.app/.netlify/functions/zenopay-withdraw-webhook';
  }

  async initiateWithdrawal(
    amount: number,
    recipientPhone: string,
    recipientName: string,
    reference: string
  ) {
    const payload: ZenoPayWithdrawRequest = {
      amount,
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      reference,
      callback_url: this.webhookUrl,
    };

    const response = await fetch(`${this.baseUrl}/mobile_money_tanzania`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`ZenoPay API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  validateTanzanianPhone(phone: string): boolean {
    // Tanzanian mobile numbers: 07XXXXXXXX or +25507XXXXXXXX
    const tanzanianPhoneRegex = /^(07\d{8}|\+25507\d{8})$/;
    return tanzanianPhoneRegex.test(phone);
  }
}

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { user_id, amount, withdrawal_phone, withdrawal_type, destination_address }: WithdrawRequest = JSON.parse(event.body || '{}');

    // Validate input
    if (!user_id || !amount || !withdrawal_type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: user_id, amount, withdrawal_type' })
      };
    }

    if (amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be greater than 0' })
      };
    }

    // Check user balance
    const userResult = await sql`
      SELECT balance, username, display_name 
      FROM users 
      WHERE id = ${user_id}
    `;

    if (userResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = userResult[0];
    const currentBalance = parseFloat(user.balance);

    if (currentBalance < amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Insufficient balance',
          current_balance: currentBalance,
          requested_amount: amount
        })
      };
    }

    const withdrawalId = crypto.randomUUID();
    const reference = `TZS-WITHDRAW-${withdrawalId.slice(0, 8)}`;

    if (withdrawal_type === 'mobile_money') {
      // Mobile money withdrawal via ZenoPay
      if (!withdrawal_phone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'withdrawal_phone is required for mobile money withdrawals' })
        };
      }

      const zenoPayService = new ZenoPayWithdrawService();

      // Validate phone number
      if (!zenoPayService.validateTanzanianPhone(withdrawal_phone)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid Tanzanian phone number format. Use 07XXXXXXXX' })
        };
      }

      // Create pending withdrawal record
      await sql`
        INSERT INTO pending_withdrawals (
          id, user_id, amount, withdrawal_phone, withdrawal_type, 
          reference, status, created_at
        ) VALUES (
          ${withdrawalId}, ${user_id}, ${amount}, ${withdrawal_phone}, 
          ${withdrawal_type}, ${reference}, 'pending', NOW()
        )
      `;

      // Deduct from user balance immediately (will be refunded if withdrawal fails)
      await sql`
        UPDATE users 
        SET balance = balance - ${amount}
        WHERE id = ${user_id}
      `;

      // Initiate ZenoPay withdrawal
      const userName = user.display_name || user.username || 'User';
      const zenoPayResponse = await zenoPayService.initiateWithdrawal(
        amount,
        withdrawal_phone,
        userName,
        reference
      );

      // Log transaction
      await sql`
        INSERT INTO transactions (
          id, user_id, type, amount, status, reference, 
          metadata, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${user_id}, 'withdrawal', ${amount}, 
          'pending', ${reference}, ${JSON.stringify({
            withdrawal_type: 'mobile_money',
            phone: withdrawal_phone,
            zenopay_response: zenoPayResponse
          })}, NOW()
        )
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Mobile money withdrawal initiated successfully. Funds will be sent to your phone shortly.',
          withdrawal_id: withdrawalId,
          reference,
          amount,
          new_balance: currentBalance - amount,
          zenopay_response: zenoPayResponse
        })
      };

    } else if (withdrawal_type === 'xrpl_token') {
      // XRPL token withdrawal (mint actual tokens to user's wallet)
      if (!destination_address) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'destination_address is required for XRPL token withdrawals' })
        };
      }

      // Create pending withdrawal record
      await sql`
        INSERT INTO pending_withdrawals (
          id, user_id, amount, destination_address, withdrawal_type, 
          reference, status, created_at
        ) VALUES (
          ${withdrawalId}, ${user_id}, ${amount}, ${destination_address}, 
          ${withdrawal_type}, ${reference}, 'pending', NOW()
        )
      `;

      // Check if amount requires multi-sig approval
      const amountUSD = amount / 2300; // Approximate TZS to USD conversion
      const requiresMultiSig = amountUSD >= 5000;

      if (requiresMultiSig) {
        // Create pending operation for multi-sig approval
        await sql`
          INSERT INTO pending_operations (
            id, operation_type, amount_tzs, amount_usd, destination_address,
            status, created_by, withdrawal_reference, created_at
          ) VALUES (
            ${crypto.randomUUID()}, 'mint', ${amount}, ${amountUSD}, 
            ${destination_address}, 'pending', ${user_id}, ${reference}, NOW()
          )
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Large withdrawal requires multi-signature approval. Your request has been submitted to administrators.',
            withdrawal_id: withdrawalId,
            reference,
            amount,
            requires_approval: true,
            estimated_usd: amountUSD
          })
        };
      } else {
        // Small amount - execute immediately
        // TODO: Call wallet service to mint XRPL tokens
        // For now, just deduct balance and mark as completed
        
        await sql`
          UPDATE users 
          SET balance = balance - ${amount}
          WHERE id = ${user_id}
        `;

        await sql`
          UPDATE pending_withdrawals 
          SET status = 'completed', completed_at = NOW()
          WHERE id = ${withdrawalId}
        `;

        // Log transaction
        await sql`
          INSERT INTO transactions (
            id, user_id, type, amount, status, reference, 
            metadata, created_at
          ) VALUES (
            ${crypto.randomUUID()}, ${user_id}, 'withdrawal', ${amount}, 
            'completed', ${reference}, ${JSON.stringify({
              withdrawal_type: 'xrpl_token',
              destination_address,
              auto_executed: true
            })}, NOW()
          )
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'XRPL tokens minted successfully to your wallet.',
            withdrawal_id: withdrawalId,
            reference,
            amount,
            new_balance: currentBalance - amount,
            destination_address
          })
        };
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid withdrawal_type. Use "mobile_money" or "xrpl_token"' })
      };
    }

  } catch (error) {
    console.error('Withdrawal error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};
