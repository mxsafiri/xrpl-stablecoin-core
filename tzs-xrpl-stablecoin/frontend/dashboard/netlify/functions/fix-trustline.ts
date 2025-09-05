import { Handler } from '@netlify/functions';
import { Client, Wallet, TrustSet } from 'xrpl';

const XRPL_NETWORK = process.env.XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233';
const TREASURY_SEED = process.env.XRPL_TREASURY_SEED || 'sEdVgrmgKYtx7NNZNupRJLqyEweRZC9';
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
    const client = new Client(XRPL_NETWORK);
    await client.connect();

    const treasuryWallet = Wallet.fromSeed(TREASURY_SEED);
    const userWalletSeed = 'sEdVwVKjSyKDFv8QpTfLie5Zopc9R7x';
    const userWallet = Wallet.fromSeed(userWalletSeed);
    
    // Create trust line with correct issuer (treasury wallet address)
    const trustSet: TrustSet = {
      TransactionType: 'TrustSet',
      Account: userWallet.address,
      LimitAmount: {
        currency: CURRENCY_CODE,
        issuer: treasuryWallet.address, // Use treasury as issuer
        value: '1000000'
      }
    };

    const prepared = await client.autofill(trustSet);
    const signed = userWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    const meta = result.result.meta as any;
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Trust line fix failed: ${meta?.TransactionResult}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Trust line fixed with correct issuer',
        txHash: result.result.hash,
        userWallet: userWallet.address,
        issuer: treasuryWallet.address,
        currency: CURRENCY_CODE,
        nextStep: 'Ready for token minting'
      })
    };

  } catch (error) {
    console.error('Trust line fix error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fix trust line',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
