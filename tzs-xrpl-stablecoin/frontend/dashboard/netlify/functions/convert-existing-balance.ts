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
    const { user_id } = JSON.parse(event.body || '{}');

    if (!user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'user_id required' })
      };
    }

    // Get user details and current balance
    const users = await sql`
      SELECT * FROM users WHERE id = ${user_id}
    `;

    if (users.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = users[0];
    const currentBalance = parseFloat(user.balance || '0');

    if (currentBalance <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No balance to convert' })
      };
    }

    console.log(`Converting ${currentBalance} TZS database balance to XRPL tokens for user ${user.wallet_address}`);

    // Mint XRPL tokens for existing balance
    const mintResponse = await fetch('https://nedalabs.netlify.app/.netlify/functions/mint-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: currentBalance,
        destinationWallet: user.wallet_address,
        reference: `balance-conversion-${Date.now()}`,
        requestedBy: 'balance-conversion'
      })
    });

    if (!mintResponse.ok) {
      const errorData = await mintResponse.json();
      throw new Error(`Token minting failed: ${errorData.message || 'Unknown error'}`);
    }

    const mintResult = await mintResponse.json();

    // Log the conversion transaction
    await sql`
      INSERT INTO transactions (
        id, user_id, type, amount, status, reference, created_at, description
      ) VALUES (
        ${require('crypto').randomUUID()}, ${user_id}, 'conversion', 
        ${currentBalance}, 'completed', ${mintResult.reference || 'balance-conversion'}, NOW(),
        ${'Database balance converted to XRPL tokens'}
      )
    `;

    console.log(`Successfully converted ${currentBalance} TZS to XRPL tokens for user ${user.username || user.wallet_address}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Balance converted to XRPL tokens successfully',
        amount: currentBalance,
        mint_result: mintResult
      })
    };

  } catch (error: any) {
    console.error('Balance conversion error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Balance conversion failed',
        error: error.message
      })
    };
  }
};
