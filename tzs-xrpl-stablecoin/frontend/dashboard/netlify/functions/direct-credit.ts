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
    const { user_id, amount, reference, description } = JSON.parse(event.body || '{}');

    if (!user_id || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing user_id or amount' })
      };
    }

    // Update user balance directly
    const updateResult = await sql`
      UPDATE users 
      SET balance = balance + ${amount}
      WHERE id = ${user_id}
      RETURNING balance, username
    `;

    if (updateResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = updateResult[0];

    // Log transaction
    await sql`
      INSERT INTO transactions (
        id, user_id, type, amount, status, reference, 
        metadata, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${user_id}, 'deposit', ${amount}, 
        'completed', ${reference || 'MANUAL_CREDIT'}, 
        ${JSON.stringify({ 
          manual_credit: true, 
          description: description || 'Manual balance credit',
          timestamp: new Date().toISOString()
        })}, NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Balance updated successfully for user ${user.username || user_id}`,
        amount_credited: amount,
        new_balance: parseFloat(user.balance),
        reference: reference || 'MANUAL_CREDIT'
      })
    };

  } catch (error) {
    console.error('Direct credit error:', error);
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
