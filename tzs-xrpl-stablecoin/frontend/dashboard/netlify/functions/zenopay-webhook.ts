import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface ZenoWebhookPayload {
  order_id: string;
  payment_status: string;
  reference: string;
  metadata?: any;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Optional webhook authentication (ZenoPay might not send API key)
    const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key'];
    if (apiKey && apiKey !== process.env.ZENOPAY_API_KEY) {
      console.error('Invalid API key in webhook');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const payload: ZenoWebhookPayload = JSON.parse(event.body || '{}');
    const { order_id, payment_status, reference } = payload;

    console.log(`ZenoPay webhook received:`, JSON.stringify(payload, null, 2));

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

    // Log successful deposit transaction
    await sql`
      INSERT INTO transactions (
        id, user_id, type, amount, status, reference, created_at, description
      ) VALUES (
        ${require('crypto').randomUUID()}, ${deposit.user_id}, 'deposit', 
        ${stablecoinAmount}, 'completed', ${order_id}, NOW(),
        ${'TZS deposit via ZenoPay - balance credited'}
      )
    `;

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
