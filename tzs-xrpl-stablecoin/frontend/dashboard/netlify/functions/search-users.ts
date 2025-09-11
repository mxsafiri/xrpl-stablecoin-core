import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { query } = JSON.parse(event.body || '{}');

    if (!query || query.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query must be at least 2 characters' })
      };
    }

    // Search users by username (case insensitive)
    const users = await sql`
      SELECT id, username, wallet_address 
      FROM users 
      WHERE username ILIKE ${`%${query}%`}
      AND username IS NOT NULL
      ORDER BY username
      LIMIT 10
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          wallet_address: user.wallet_address
        }))
      })
    };

  } catch (error: any) {
    console.error('Search users error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to search users'
      })
    };
  }
};
