import { Handler } from '@netlify/functions';
import { Client, Wallet, TrustSet } from 'xrpl';

const XRPL_NETWORK = process.env.XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233';
const ISSUER_ADDRESS = process.env.XRPL_ISSUER_ADDRESS || 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM';
const CURRENCY_CODE = process.env.XRPL_CURRENCY_CODE || 'TZS';

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
    // Use a pre-generated seed for the user's wallet address
    // In production, this would be securely managed per user
    const userWalletSeed = 'sEdVwVKjSyKDFv8QpTfLie5Zopc9R7x'; // From generated wallet
    
    const client = new Client(XRPL_NETWORK);
    await client.connect();

    const wallet = Wallet.fromSeed(userWalletSeed);
    
    // First, fund this wallet if needed
    try {
      await fetch('https://faucet.altnet.rippletest.net/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: wallet.address })
      });
    } catch (e) {
      // Funding may fail if already funded, continue anyway
    }

    // Create trust line for TZS token
    const trustSet: TrustSet = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency: CURRENCY_CODE,
        issuer: ISSUER_ADDRESS,
        value: '1000000' // Max trust limit
      }
    };

    const prepared = await client.autofill(trustSet);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    const meta = result.result.meta as any;
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Trust line creation failed: ${meta?.TransactionResult}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Trust line created successfully',
        txHash: result.result.hash,
        wallet: wallet.address,
        trustLine: {
          currency: CURRENCY_CODE,
          issuer: ISSUER_ADDRESS,
          limit: '1000000'
        },
        nextStep: 'Ready for token minting'
      })
    };

  } catch (error) {
    console.error('Trust line setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to setup trust line',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
