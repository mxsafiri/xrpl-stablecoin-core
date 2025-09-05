import { Handler } from '@netlify/functions';
import { Client, Wallet, TrustSet } from 'xrpl';

const client = new Client('wss://s.altnet.rippletest.net:51233');

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
    await client.connect();
    
    // Your main wallet with 6,000 TZS fiat balance
    const mainWalletAddress = 'rEEUwERJPUxeqysqKHFgoerUXcDKyPefGt';
    
    // We need to fund this wallet first to create trust line
    // Generate a temporary wallet to get XRP for trust line setup
    const tempWallet = Wallet.generate();
    await client.fundWallet(tempWallet);
    
    // Send XRP to main wallet for trust line creation
    const payment = {
      TransactionType: 'Payment',
      Account: tempWallet.address,
      Destination: mainWalletAddress,
      Amount: '20000000' // 20 XRP for trust line and fees
    };
    
    const paymentResult = await client.submitAndWait(payment, { wallet: tempWallet });
    
    // Now we need the seed for the main wallet to create trust line
    // Since we don't have it, let's create a new wallet and update the user record
    const newWallet = Wallet.generate();
    await client.fundWallet(newWallet);
    
    // Treasury wallet address (issuer)
    const treasuryAddress = process.env.XRPL_TREASURY_ADDRESS || 'rMNVNXxk27WPE1zyFSPC6RRnPP7RBBGeCv';
    
    // Create trust line for TZS tokens
    const trustSetTx = {
      TransactionType: 'TrustSet',
      Account: newWallet.address,
      LimitAmount: {
        currency: 'TZS',
        issuer: treasuryAddress,
        value: '1000000' // 1M TZS limit
      }
    };
    
    const trustResult = await client.submitAndWait(trustSetTx, { wallet: newWallet });
    
    await client.disconnect();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'New wallet created with trust line for 1:1 conversion',
        newWalletAddress: newWallet.address,
        newWalletSeed: newWallet.seed,
        trustLineTxHash: trustResult.result.hash,
        paymentTxHash: paymentResult.result.hash,
        nextStep: 'Update user record with new wallet address',
        note: 'This wallet is ready for 1:1 TZS fiat to token conversion'
      })
    };

  } catch (error) {
    await client.disconnect();
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
