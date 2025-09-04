import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { order_id, amount, reference } = JSON.parse(event.body || '{}');

    if (!order_id || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing order_id or amount' })
      };
    }

    // Find the pending deposit
    const depositResult = await sql`
      SELECT pd.*, u.id as user_id, u.balance, u.username
      FROM pending_deposits pd
      JOIN users u ON pd.user_id = u.id
      WHERE pd.order_id = ${order_id} AND pd.status = 'pending'
    `;

    if (depositResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Pending deposit not found' })
      };
    }

    const deposit = depositResult[0];

    // Update user balance
    await sql`
      UPDATE users 
      SET balance = balance + ${amount}
      WHERE id = ${deposit.user_id}
    `;

    // Mark deposit as completed
    await sql`
      UPDATE pending_deposits 
      SET status = 'completed', reference = ${reference || null}, updated_at = NOW()
      WHERE order_id = ${order_id}
    `;

    // Log transaction
    await sql`
      INSERT INTO transactions (
        id, user_id, type, amount, status, reference, 
        metadata, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${deposit.user_id}, 'deposit', ${amount}, 
        'completed', ${reference || order_id}, 
        ${JSON.stringify({ manual_credit: true, original_order_id: order_id })}, NOW()
      )
    `;

    // Get updated balance
    const updatedUser = await sql`
      SELECT balance FROM users WHERE id = ${deposit.user_id}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Balance updated successfully for user ${deposit.username}`,
        order_id,
        amount_credited: amount,
        new_balance: parseFloat(updatedUser[0].balance),
        reference
      })
    };

  } catch (error) {
    console.error('Manual credit error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
