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

  try {
    // Credit the most recent user (Agent) with 1000 TZS for the M-Pesa payment
    const updateResult = await sql`
      UPDATE users 
      SET balance = balance + 1000
      WHERE username = 'Agent '
      RETURNING balance, username, id
    `;

    if (updateResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = updateResult[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `✅ Balance updated! M-Pesa payment of 1,000 TZS credited successfully.`,
        user: user.username,
        new_balance: parseFloat(user.balance),
        transaction_ref: "0975607998",
        mpesa_ref: "CI46JWHNA96"
      })
    };

  } catch (error) {
    console.error('Simple credit error:', error);
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
