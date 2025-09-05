import { Handler } from '@netlify/functions';
import { Client, Wallet, AccountSet } from 'xrpl';

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
    
    // First, fund the treasury wallet if needed
    try {
      await fetch('https://faucet.altnet.rippletest.net/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: treasuryWallet.address })
      });
    } catch (e) {
      // Funding may fail if already funded, continue anyway
    }

    // Set up the treasury wallet as a token issuer
    const accountSet: AccountSet = {
      TransactionType: 'AccountSet',
      Account: treasuryWallet.address,
      SetFlag: 8, // asfDefaultRipple - allows issued tokens to ripple
    };

    const prepared = await client.autofill(accountSet);
    const signed = treasuryWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    const meta = result.result.meta as any;
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Issuer setup failed: ${meta?.TransactionResult}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Treasury wallet configured as token issuer',
        txHash: result.result.hash,
        issuerAddress: treasuryWallet.address,
        currency: CURRENCY_CODE,
        settings: {
          defaultRipple: true,
          canIssueTokens: true
        },
        nextStep: 'Ready for token minting'
      })
    };

  } catch (error) {
    console.error('Issuer setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to setup issuer',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
