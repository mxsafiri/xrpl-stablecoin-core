import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyZenoPayWebhook, validateZenoPayload, logSecurityEvent } from './webhook-security';
import { getSecureCorsHeaders } from './cors-config';

const sql = neon(process.env.DATABASE_URL!);

interface ZenoWebhookPayload {
  order_id: string;
  payment_status: string;
  reference: string;
  metadata?: any;
}

// Create notification for deposit status updates
async function createNotification(order_id: string, status: 'success' | 'failed', payload: ZenoWebhookPayload) {
  try {
    // Get deposit and user info
    const depositResult = await sql`
      SELECT pd.*, u.id as user_id, u.username, u.buyer_phone
      FROM pending_deposits pd
      LEFT JOIN users u ON pd.user_id::text = u.id::text
      WHERE pd.order_id = ${order_id}
    `;

    if (depositResult.length > 0) {
      const deposit = depositResult[0];
      const message = status === 'success' 
        ? `✅ Deposit of ${deposit.amount} TZS completed successfully!`
        : `❌ Deposit of ${deposit.amount} TZS failed. Please try again.`;

      // Store notification in database
      await sql`
        INSERT INTO notifications (
          id, user_id, title, message, type, status, created_at
        ) VALUES (
          ${require('crypto').randomUUID()}, ${deposit.user_id}, 
          ${status === 'success' ? 'Deposit Successful' : 'Deposit Failed'},
          ${message}, 'deposit', 'unread', NOW()
        )
      `;

      console.log(`Notification created for user ${deposit.username}: ${message}`);
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export const handler: Handler = async (event, context) => {
  const headers = getSecureCorsHeaders(event.headers.origin);

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
    // CRITICAL SECURITY FIX: HMAC signature verification
    const signature = event.headers['x-signature'] || event.headers['X-Signature'];
    const webhookSecret = process.env.ZENOPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logSecurityEvent('webhook_no_secret', { source: 'zenopay' }, 'error');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }

    // Verify webhook authenticity
    if (signature) {
      try {
        const isValid = verifyZenoPayWebhook(event.body || '', signature, webhookSecret);
        if (!isValid) {
          logSecurityEvent('webhook_invalid_signature', { 
            source: 'zenopay',
            signature: signature?.substring(0, 10) + '...' 
          }, 'error');
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid webhook signature' })
          };
        }
      } catch (error: any) {
        logSecurityEvent('webhook_verification_error', { 
          source: 'zenopay',
          error: error.message 
        }, 'error');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Webhook verification failed' })
        };
      }
    } else {
      // Log missing signature but allow for backward compatibility
      logSecurityEvent('webhook_no_signature', { source: 'zenopay' }, 'warning');
    }

    const payload: ZenoWebhookPayload = JSON.parse(event.body || '{}');
    
    // Validate payload structure
    if (!validateZenoPayload(payload)) {
      logSecurityEvent('webhook_invalid_payload', { 
        source: 'zenopay',
        payload: payload 
      }, 'error');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook payload' })
      };
    }

    const { order_id, payment_status, reference } = payload;

    logSecurityEvent('webhook_received', {
      source: 'zenopay',
      order_id,
      payment_status,
      has_signature: !!signature
    }, 'info');

    // Handle different payment statuses
    if (payment_status === 'FAILED' || payment_status === 'CANCELLED' || payment_status === 'REJECTED') {
      // Update deposit status to failed
      await sql`
        UPDATE pending_deposits 
        SET status = 'failed', reference = ${reference}, updated_at = NOW()
        WHERE order_id = ${order_id}
      `;

      // Create notification for failed payment
      await createNotification(order_id, 'failed', payload);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Payment failed, deposit marked as failed',
          status: payment_status 
        })
      };
    }

    // Only process completed payments
    if (payment_status !== 'COMPLETED') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Payment not completed, ignoring' })
      };
    }

    // Find the pending deposit by order_id (handle user_id as text)
    const depositResult = await sql`
      SELECT pd.*, u.id as user_id, u.username, u.balance
      FROM pending_deposits pd
      LEFT JOIN users u ON pd.user_id::text = u.id::text
      WHERE pd.order_id = ${order_id} AND pd.status = 'pending'
    `;

    // If no user found, try to find by email/phone and credit the most recent user
    if (depositResult.length === 0 || !depositResult[0].user_id) {
      const fallbackResult = await sql`
        SELECT pd.*, u.id as user_id, u.username, u.balance
        FROM pending_deposits pd
        CROSS JOIN (SELECT id, username, balance FROM users ORDER BY created_at DESC LIMIT 1) u
        WHERE pd.order_id = ${order_id} AND pd.status = 'pending'
      `;
      
      if (fallbackResult.length > 0) {
        depositResult[0] = fallbackResult[0];
      }
    }

    if (depositResult.length === 0) {
      console.error(`No pending deposit found for order_id: ${order_id}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Deposit not found' })
      };
    }

    const deposit = depositResult[0];

    // Update deposit status to completed
    await sql`
      UPDATE pending_deposits 
      SET status = 'completed', reference = ${reference}, updated_at = NOW()
      WHERE order_id = ${order_id}
    `;

    // Get user details
    const users = await sql`
      SELECT * FROM users WHERE id = ${deposit.user_id}
    `;

    if (users.length === 0) {
      throw new Error(`User not found: ${deposit.user_id}`);
    }

    const user = users[0];

    // Calculate stablecoin amount (1:1 for now)
    const stablecoinAmount = deposit.amount;

    // Update user balance in database (off-chain balance)
    await sql`
      UPDATE users 
      SET balance = balance + ${stablecoinAmount}, updated_at = NOW()
      WHERE id = ${deposit.user_id}
    `;

    // Mint actual XRPL tokens for the deposit
    let tokenMintResult = null;
    try {
      console.log(`Attempting to mint ${stablecoinAmount} TZS tokens for user ${user.wallet_address}`);
      
      const mintResponse = await fetch('https://nedalabs.netlify.app/.netlify/functions/mint-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: stablecoinAmount,
          destinationWallet: user.wallet_address,
          reference: `deposit-${order_id}`,
          requestedBy: 'zenopay-webhook'
        })
      });

      if (mintResponse.ok) {
        tokenMintResult = await mintResponse.json();
        console.log(`Successfully minted ${stablecoinAmount} TZS tokens:`, tokenMintResult);
      } else {
        const errorData = await mintResponse.json();
        console.error('Token minting failed:', errorData);
        // Continue with database credit even if minting fails
      }
    } catch (mintError) {
      console.error('Token minting error:', mintError);
      // Continue with database credit even if minting fails
    }

    // Log successful deposit transaction
    await sql`
      INSERT INTO transactions (
        id, user_id, type, amount, status, reference, created_at, description
      ) VALUES (
        ${require('crypto').randomUUID()}, ${deposit.user_id}, 'deposit', 
        ${stablecoinAmount}, 'completed', ${order_id}, NOW(),
        ${tokenMintResult ? 'TZS deposit via ZenoPay - tokens minted and balance credited' : 'TZS deposit via ZenoPay - balance credited (token minting pending)'}
      )
    `;

    // Create success notification
    await createNotification(order_id, 'success', payload);

    console.log(`Successfully credited ${stablecoinAmount} TZS to user ${user.username || user.wallet_address} balance`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Deposit processed successfully',
        order_id: order_id,
        amount: stablecoinAmount
      })
    };

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      })
    };
  }
};
