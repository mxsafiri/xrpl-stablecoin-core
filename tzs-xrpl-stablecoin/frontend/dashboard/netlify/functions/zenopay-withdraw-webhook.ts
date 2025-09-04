import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface ZenoPayWithdrawWebhook {
  status: 'success' | 'failed' | 'pending';
  reference: string;
  amount: number;
  recipient_phone: string;
  transaction_id?: string;
  failure_reason?: string;
  timestamp: string;
}

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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
    // Verify webhook authenticity (optional - implement if ZenoPay provides webhook signatures)
    const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key'];
    if (apiKey && apiKey !== process.env.ZENOPAY_WEBHOOK_SECRET) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized webhook' })
      };
    }

    const webhookData: ZenoPayWithdrawWebhook = JSON.parse(event.body || '{}');
    console.log('Withdrawal webhook received:', webhookData);

    const { status, reference, amount, recipient_phone, transaction_id, failure_reason } = webhookData;

    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing reference in webhook data' })
      };
    }

    // Find the pending withdrawal
    const withdrawalResult = await sql`
      SELECT pw.*, u.id as user_id, u.username, u.display_name, u.balance
      FROM pending_withdrawals pw
      JOIN users u ON pw.user_id = u.id
      WHERE pw.reference = ${reference} AND pw.status = 'pending'
    `;

    if (withdrawalResult.length === 0) {
      console.log(`No pending withdrawal found for reference: ${reference}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Withdrawal not found or already processed' })
      };
    }

    const withdrawal = withdrawalResult[0];

    if (status === 'success') {
      // Withdrawal successful - mark as completed
      await sql`
        UPDATE pending_withdrawals 
        SET status = 'completed', 
            transaction_id = ${transaction_id || null},
            completed_at = NOW(),
            updated_at = NOW()
        WHERE reference = ${reference}
      `;

      // Update transaction record
      await sql`
        UPDATE transactions 
        SET status = 'completed',
            metadata = jsonb_set(
              COALESCE(metadata, '{}')::jsonb,
              '{transaction_id}',
              ${JSON.stringify(transaction_id || null)}
            ),
            updated_at = NOW()
        WHERE reference = ${reference}
      `;

      // Log successful withdrawal
      await sql`
        INSERT INTO audit_logs (
          id, user_id, action, details, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${withdrawal.user_id}, 'withdrawal_completed',
          ${JSON.stringify({
            reference,
            amount,
            recipient_phone,
            transaction_id,
            withdrawal_type: 'mobile_money'
          })}, NOW()
        )
      `;

      console.log(`Withdrawal completed successfully: ${reference}`);

    } else if (status === 'failed') {
      // Withdrawal failed - refund user balance
      await sql`
        UPDATE pending_withdrawals 
        SET status = 'failed', 
            failure_reason = ${failure_reason || 'Unknown error'},
            updated_at = NOW()
        WHERE reference = ${reference}
      `;

      // Refund the user's balance
      await sql`
        UPDATE users 
        SET balance = balance + ${withdrawal.amount}
        WHERE id = ${withdrawal.user_id}
      `;

      // Update transaction record
      await sql`
        UPDATE transactions 
        SET status = 'failed',
            metadata = jsonb_set(
              COALESCE(metadata, '{}')::jsonb,
              '{failure_reason}',
              ${JSON.stringify(failure_reason || 'Unknown error')}
            ),
            updated_at = NOW()
        WHERE reference = ${reference}
      `;

      // Log failed withdrawal
      await sql`
        INSERT INTO audit_logs (
          id, user_id, action, details, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${withdrawal.user_id}, 'withdrawal_failed',
          ${JSON.stringify({
            reference,
            amount,
            recipient_phone,
            failure_reason,
            balance_refunded: true
          })}, NOW()
        )
      `;

      console.log(`Withdrawal failed and balance refunded: ${reference} - ${failure_reason}`);

    } else {
      // Status is still pending - just log the update
      console.log(`Withdrawal status update: ${reference} - ${status}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        reference,
        status,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Withdrawal webhook error:', error);
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
