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
    const { amount, destinationWallet, reference, requestedBy } = JSON.parse(event.body || '{}');
    
    if (!amount || !destinationWallet) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount and destination wallet required' })
      };
    }

    // Calculate USD value (assuming TZS = $1 for now)
    const usdValue = amount * 1.0;
    
    // Get multi-sig threshold from settings
    const thresholdResult = await sql`
      SELECT setting_value FROM system_settings WHERE setting_key = 'multisig_threshold_usd'
    `;
    const threshold = parseFloat(thresholdResult[0]?.setting_value || '5000');
    
    // Check if operation requires multi-sig approval
    if (usdValue >= threshold) {
      // Create pending operation
      const pendingOp = await sql`
        INSERT INTO pending_operations (
          operation_type, amount, usd_value, destination_wallet, 
          reference, requested_by, required_approvals
        )
        VALUES ('mint', ${amount}, ${usdValue}, ${destinationWallet}, 
                ${reference}, ${requestedBy}, 2)
        RETURNING id
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          requiresApproval: true,
          operationId: pendingOp[0].id,
          message: `Operation requires approval (${usdValue} USD >= ${threshold} USD threshold)`
        })
      };
    } else {
      // Execute immediately for amounts below threshold
      const txHash = await xrplService.mintTokens(destinationWallet, amount, reference);
      
      // Record in database (minting has no from_wallet, only to_wallet)
      await sql`
        INSERT INTO transactions (xrpl_transaction_hash, type, from_wallet, to_wallet, amount, created_at)
        VALUES (${txHash}, 'mint', 'treasury', ${destinationWallet}, ${amount}, NOW())
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          txHash, 
          amount, 
          destinationWallet,
          message: 'Tokens minted successfully'
        })
      };
    }
  } catch (error) {
    console.error('Mint error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to mint tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
