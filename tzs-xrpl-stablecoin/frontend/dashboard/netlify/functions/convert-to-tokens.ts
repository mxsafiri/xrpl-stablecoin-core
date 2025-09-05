import { Handler } from '@netlify/functions';
import { xrplService } from './xrpl-service';
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
    const { amount, userWalletAddress, userId } = JSON.parse(event.body || '{}');
    
    if (!amount || !userWalletAddress || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount, wallet address, and user ID required' })
      };
    }

    // Check user's fiat balance
    const userResult = await sql`
      SELECT balance FROM users WHERE id = ${userId} OR wallet_address = ${userWalletAddress}
    `;

    if (userResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const currentFiatBalance = parseFloat(userResult[0].balance || '0');
    
    if (currentFiatBalance < amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Insufficient fiat balance',
          available: currentFiatBalance,
          requested: amount
        })
      };
    }

    // 1:1 conversion - mint XRPL tokens equal to fiat amount
    const txHash = await xrplService.mintTokens(userWalletAddress, amount, `Convert ${amount} TZS fiat to tokens`);
    
    // Deduct fiat balance (1:1 conversion)
    const newFiatBalance = currentFiatBalance - amount;
    await sql`
      UPDATE users 
      SET balance = ${newFiatBalance}
      WHERE id = ${userId} OR wallet_address = ${userWalletAddress}
    `;

    // Record the conversion transaction
    await sql`
      INSERT INTO transactions (xrpl_transaction_hash, type, from_wallet, to_wallet, amount, created_at, user_id)
      VALUES (${txHash}, 'fiat_to_token', 'fiat_balance', ${userWalletAddress}, ${amount}, NOW(), ${userId})
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        txHash, 
        amount,
        conversion: '1:1 TZS fiat to TZS tokens',
        newFiatBalance,
        tokensReceived: amount,
        userWalletAddress,
        message: `Successfully converted ${amount} TZS fiat to ${amount} TZS tokens`
      })
    };

  } catch (error) {
    console.error('Conversion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to convert fiat to tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
