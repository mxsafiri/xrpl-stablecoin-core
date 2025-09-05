import { Handler } from '@netlify/functions';
import { Wallet } from 'xrpl';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Generate a new XRPL wallet
    const wallet = Wallet.generate();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey,
          privateKey: wallet.privateKey,
          seed: wallet.seed
        },
        message: 'New XRPL wallet generated successfully',
        warning: 'Store the seed securely - it cannot be recovered if lost!'
      })
    };

  } catch (error) {
    console.error('Wallet generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate wallet',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
