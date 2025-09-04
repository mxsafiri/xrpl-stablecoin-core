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
    // Transfer 3000 TZS from Agent account to the XRPL wallet user
    const targetWalletAddress = 'rEEUwERJPUxeqysqKHFgoerUXcDKyPefGt';
    
    // First, create or update the user with the XRPL wallet address
    await sql`
      INSERT INTO users (id, username, balance, wallet_address, created_at)
      VALUES (${crypto.randomUUID()}, 'Victor', 3000, ${targetWalletAddress}, NOW())
      ON CONFLICT (wallet_address) 
      DO UPDATE SET balance = users.balance + 3000, username = 'Victor'
    `;

    // Reset Agent balance to 0
    await sql`
      UPDATE users 
      SET balance = 0
      WHERE username = 'Agent '
    `;

    // Get the updated user info
    const userResult = await sql`
      SELECT id, username, balance, wallet_address
      FROM users 
      WHERE wallet_address = ${targetWalletAddress}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `✅ Balance transferred successfully!`,
        user: userResult[0] || { wallet_address: targetWalletAddress, balance: 3000 },
        transferred_amount: 3000
      })
    };

  } catch (error) {
    console.error('Transfer balance error:', error);
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
