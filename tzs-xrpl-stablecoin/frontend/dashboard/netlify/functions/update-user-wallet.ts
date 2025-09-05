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
    const { userId, newWalletAddress, walletSeed } = JSON.parse(event.body || '{}');
    
    if (!userId || !newWalletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID and new wallet address required' })
      };
    }

    // Update the user's wallet address
    const updateResult = await sql`
      UPDATE users 
      SET wallet_address = ${newWalletAddress}
      WHERE id = ${userId}
      RETURNING id, wallet_address, balance, username, display_name
    `;

    if (updateResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const updatedUser = updateResult[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User wallet address updated successfully',
        user: {
          id: updatedUser.id,
          walletAddress: updatedUser.wallet_address,
          fiatBalance: parseFloat(updatedUser.balance || '0'),
          username: updatedUser.username,
          displayName: updatedUser.display_name
        },
        walletSeed: walletSeed,
        note: 'This wallet has trust line set up and is ready for 1:1 TZS conversion'
      })
    };

  } catch (error) {
    console.error('Update user wallet error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update user wallet',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
