import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check recent deposits
    const deposits = await sql`
      SELECT pd.*, u.username, u.balance 
      FROM pending_deposits pd
      LEFT JOIN users u ON pd.user_id::text = u.id::text
      ORDER BY pd.created_at DESC 
      LIMIT 10
    `;

    // Check users
    const users = await sql`
      SELECT id, username, balance, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    // Check transactions
    const transactions = await sql`
      SELECT * FROM transactions 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        deposits,
        users,
        transactions,
        timestamp: new Date().toISOString()
      }, null, 2)
    };

  } catch (error) {
    console.error('Check deposits error:', error);
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
