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
    // Get all users with their balances
    const users = await sql`
      SELECT id, wallet_address, balance, username, display_name, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        users: users.map(user => ({
          id: user.id,
          walletAddress: user.wallet_address,
          fiatBalance: parseFloat(user.balance || '0'),
          username: user.username,
          displayName: user.display_name,
          role: user.role,
          createdAt: user.created_at
        }))
      })
    };

  } catch (error) {
    console.error('Get user balance error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get user balances',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
