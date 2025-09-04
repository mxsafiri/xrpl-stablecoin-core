import { Handler } from '@netlify/functions';
import { xrplService } from './xrpl-service';

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
    // Test XRPL connection and configuration
    const networkInfo = await xrplService.getNetworkInfo();
    
    // Test wallet funding (testnet only)
    const testWallet = 'rEEUwERJPUxeqysqKHFgoerUXcDKyPefGt';
    
    let fundingResult = null;
    try {
      fundingResult = await xrplService.fundAccount(testWallet);
    } catch (error) {
      fundingResult = `Funding failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Check balances after funding
    const xrpBalance = await xrplService.getXRPBalance(testWallet);
    const tzsBalance = await xrplService.getTokenBalance(testWallet);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        networkInfo,
        testWallet,
        fundingResult,
        balances: {
          xrp: xrpBalance,
          tzs: tzsBalance
        },
        environment: {
          network: process.env.XRPL_NETWORK || 'default testnet',
          issuer: process.env.XRPL_ISSUER_ADDRESS || 'default issuer',
          currency: process.env.XRPL_CURRENCY_CODE || 'TZS',
          hasTreasurySeed: !!process.env.XRPL_TREASURY_SEED
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('XRPL test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'XRPL test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};
