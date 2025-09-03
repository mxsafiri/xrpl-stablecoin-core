import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { xrplService } from './xrpl-service'

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const path = event.path.replace('/.netlify/functions/database', '')
    const body = JSON.parse(event.body || '{}')

    // Real XRPL token minting with threshold-based multi-sig
    if (event.httpMethod === 'POST' && path === '/mint') {
      const { amount, destinationWallet, reference, requestedBy } = body
      
      try {
        // Calculate USD value (assuming TZS = $1 for now, should use real price feed)
        const usdValue = amount * 1.0
        
        // Get multi-sig threshold from settings
        const thresholdResult = await sql`
          SELECT setting_value FROM system_settings WHERE setting_key = 'multisig_threshold_usd'
        `
        const threshold = parseFloat(thresholdResult[0]?.setting_value || '5000')
        
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
          `
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              requiresApproval: true,
              operationId: pendingOp[0].id,
              message: `Operation requires approval (${usdValue} USD >= ${threshold} USD threshold)`
            })
          }
        } else {
          // Execute immediately for amounts below threshold
          const txHash = await xrplService.mintTokens(destinationWallet, amount, reference)
          
          // Record in database
          await sql`
            INSERT INTO transactions (xrpl_transaction_hash, type, to_wallet, amount, created_at)
            VALUES (${txHash}, 'mint', ${destinationWallet}, ${amount}, NOW())
          `
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, txHash, amount, destinationWallet })
          }
        }
      } catch (error) {
        console.error('Mint error:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to mint tokens' })
        }
      }
    }

    // Real XRPL token burning with threshold-based multi-sig
    if (event.httpMethod === 'POST' && path === '/burn') {
      const { amount, sourceWallet, reference, requestedBy } = body
      
      try {
        // Calculate USD value (assuming TZS = $1 for now, should use real price feed)
        const usdValue = amount * 1.0
        
        // Get multi-sig threshold from settings
        const thresholdResult = await sql`
          SELECT setting_value FROM system_settings WHERE setting_key = 'multisig_threshold_usd'
        `
        const threshold = parseFloat(thresholdResult[0]?.setting_value || '5000')
        
        // Check if operation requires multi-sig approval
        if (usdValue >= threshold) {
          // Create pending operation
          const pendingOp = await sql`
            INSERT INTO pending_operations (
              operation_type, amount, usd_value, source_wallet, 
              reference, requested_by, required_approvals
            )
            VALUES ('burn', ${amount}, ${usdValue}, ${sourceWallet}, 
                    ${reference}, ${requestedBy}, 2)
            RETURNING id
          `
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              requiresApproval: true,
              operationId: pendingOp[0].id,
              message: `Operation requires approval (${usdValue} USD >= ${threshold} USD threshold)`
            })
          }
        } else {
          // Execute immediately for amounts below threshold
          const txHash = await xrplService.burnTokens(sourceWallet, amount, reference)
          
          // Record in database
          await sql`
            INSERT INTO transactions (xrpl_transaction_hash, type, from_wallet, amount, created_at)
            VALUES (${txHash}, 'burn', ${sourceWallet}, ${amount}, NOW())
          `
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, txHash, amount, sourceWallet })
          }
        }
      } catch (error) {
        console.error('Burn error:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to burn tokens' })
        }
      }
    }

    // Get live balance from XRPL
    if (event.httpMethod === 'GET' && path.startsWith('/balance/')) {
      const walletAddress = path.split('/')[2]
      
      try {
        const tzsBalance = await xrplService.getTokenBalance(walletAddress)
        const xrpBalance = await xrplService.getXRPBalance(walletAddress)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            tzsBalance, 
            xrpBalance, 
            walletAddress,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Balance fetch error:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch balance' })
        }
      }
    }

    // Get pending operations for admin approval
    if (event.httpMethod === 'GET' && path === '/pending-operations') {
      const result = await sql`
        SELECT po.*, 
               COUNT(oa.id) as approval_count,
               ARRAY_AGG(oa.approved_by) FILTER (WHERE oa.approved_by IS NOT NULL) as approvers
        FROM pending_operations po
        LEFT JOIN operation_approvals oa ON po.id = oa.operation_id
        WHERE po.status = 'pending'
        GROUP BY po.id
        ORDER BY po.created_at DESC
      `
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    // Approve a pending operation
    if (event.httpMethod === 'POST' && path.startsWith('/approve/')) {
      const operationId = parseInt(path.split('/')[2])
      const { approvedBy } = body
      
      try {
        // Add approval
        await sql`
          INSERT INTO operation_approvals (operation_id, approved_by)
          VALUES (${operationId}, ${approvedBy})
          ON CONFLICT (operation_id, approved_by) DO NOTHING
        `
        
        // Check if enough approvals
        const operation = await sql`
          SELECT po.*, COUNT(oa.id) as approval_count
          FROM pending_operations po
          LEFT JOIN operation_approvals oa ON po.id = oa.operation_id
          WHERE po.id = ${operationId} AND po.status = 'pending'
          GROUP BY po.id
        `
        
        if (operation.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Operation not found' })
          }
        }
        
        const op = operation[0]
        
        // Execute if enough approvals
        if (op.approval_count >= op.required_approvals) {
          let txHash
          
          if (op.operation_type === 'mint') {
            txHash = await xrplService.mintTokens(op.destination_wallet, op.amount, op.reference)
            
            // Record transaction
            await sql`
              INSERT INTO transactions (xrpl_transaction_hash, type, to_wallet, amount, created_at)
              VALUES (${txHash}, 'mint', ${op.destination_wallet}, ${op.amount}, NOW())
            `
          } else if (op.operation_type === 'burn') {
            txHash = await xrplService.burnTokens(op.source_wallet, op.amount, op.reference)
            
            // Record transaction
            await sql`
              INSERT INTO transactions (xrpl_transaction_hash, type, from_wallet, amount, created_at)
              VALUES (${txHash}, 'burn', ${op.source_wallet}, ${op.amount}, NOW())
            `
          }
          
          // Mark operation as executed
          await sql`
            UPDATE pending_operations 
            SET status = 'executed', current_approvals = ${op.approval_count}
            WHERE id = ${operationId}
          `
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              executed: true, 
              txHash,
              message: 'Operation approved and executed'
            })
          }
        } else {
          // Update approval count
          await sql`
            UPDATE pending_operations 
            SET current_approvals = ${op.approval_count}
            WHERE id = ${operationId}
          `
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              executed: false,
              approvals: op.approval_count,
              required: op.required_approvals,
              message: `Approval recorded. ${op.required_approvals - op.approval_count} more approvals needed.`
            })
          }
        }
      } catch (error) {
        console.error('Approval error:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to process approval' })
        }
      }
    }

    if (event.httpMethod === 'GET' && path === '/transactions') {
      const result = await sql`
        SELECT t.*, u.wallet_address 
        FROM transactions t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC 
        LIMIT 50
      `
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    if (event.path.includes('/pending-operations')) {
      const result = await sql`SELECT * FROM multisig_operations WHERE status = 'pending' ORDER BY created_at DESC`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    if (event.httpMethod === 'GET' && path === '/wallet-balances') {
      const result = await sql`SELECT wallet_address, balance FROM users`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    if (event.path.includes('/collateral-balance')) {
      const result = await sql`SELECT SUM(amount) as total FROM collateral_ledger WHERE type = 'deposit'`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ total: result[0]?.total || 0 })
      }
    }

    if (event.httpMethod === 'POST' && path.startsWith('/approve/')) {
      const operationId = path.split('/')[2]
      const { userWallet } = JSON.parse(event.body || '{}')
      
      // Check if user is admin
      const userCheck = await sql`SELECT role FROM users WHERE wallet_address = ${userWallet}`
      if (userCheck.length === 0 || userCheck[0].role !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        }
      }

      // Update operation status
      await sql`
        UPDATE multisig_operations 
        SET status = 'approved', approved_by = ${userWallet}, approved_at = NOW() 
        WHERE id = ${operationId}
      `
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    }

  } catch (error) {
    console.error('Database function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
