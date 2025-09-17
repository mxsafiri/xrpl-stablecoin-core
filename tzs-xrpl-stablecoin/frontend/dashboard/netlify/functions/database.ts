import { Handler, HandlerResponse } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { getSecureCorsHeaders, GENERIC_ERRORS, createSecurityLog } from './cors-config'
import { verifyJWT, checkRateLimit } from './jwt-middleware'
import { xrplService } from './xrpl-service'

// Fail fast if DATABASE_URL is not configured - security requirement
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const sql = neon(process.env.DATABASE_URL)

export const handler: Handler = async (event, context): Promise<HandlerResponse> => {
  const headers = getSecureCorsHeaders(event.headers.origin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const path = event.path.replace('/.netlify/functions/database', '')
    const body = JSON.parse(event.body || '{}')

    // Add authentication to critical endpoints
    if (event.httpMethod === 'POST' && (path === '/mint' || path === '/burn' || body.action === 'getBalance')) {
      try {
        const authenticatedUser = verifyJWT(event.headers.authorization || event.headers.Authorization);
        console.log(createSecurityLog('database_authenticated_access', { 
          userId: authenticatedUser.userId, 
          action: path || body.action 
        }));
      } catch (error: any) {
        console.log(createSecurityLog('database_auth_failed', { 
          action: path || body.action,
          error: error.message 
        }, 'warning'));
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: GENERIC_ERRORS.UNAUTHORIZED })
        };
      }
    }

    // Real XRPL token minting with threshold-based multi-sig
    if (event.httpMethod === 'POST' && path === '/mint') {
      const { amount, destinationWallet, reference, requestedBy } = body
      
      try {
        // Calculate USD value (1 USD = ~2600 TZS)
        const usdValue = amount / 2600
        
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
        // Calculate USD value (1 USD = ~2600 TZS)
        const usdValue = amount / 2600
        
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

    // Get balance from database (fiat balance, not XRPL tokens)
    if (event.httpMethod === 'GET' && path.startsWith('/balance/')) {
      const walletAddress = path.split('/')[2]
      
      try {
        // Get fiat balance from database
        const userResult = await sql`
          SELECT balance FROM users WHERE wallet_address = ${walletAddress}
        `
        const tzsBalance = userResult.length > 0 ? parseFloat(userResult[0].balance) : 0
        
        // Still get XRP balance from XRPL for reference
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

    // Handle POST requests with actions
    if (event.httpMethod === 'POST') {
      const { action, wallet_address, user_id, amount, destinationWallet, reference, requestedBy } = body;

      if (action === 'getUserBalance') {
        const result = await sql`
          SELECT balance FROM users WHERE wallet_address = ${wallet_address}
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            balance: result[0]?.balance || '0',
            wallet_address 
          })
        };
      }

      if (action === 'getBalance') {
        const result = await sql`
          SELECT balance FROM users WHERE id = ${user_id}
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            balance: result[0]?.balance || '0'
          })
        };
      }

      if (action === 'getAdminStats') {
        // Get total users
        const usersResult = await sql`SELECT COUNT(*) as count FROM users`;
        const totalUsers = parseInt(usersResult[0]?.count || '0');

        // Get total supply (sum of all user balances)
        const supplyResult = await sql`SELECT SUM(CAST(balance AS DECIMAL)) as total FROM users`;
        const totalSupply = parseFloat(supplyResult[0]?.total || '0');

        // Get blockchain activity stats
        const mintResult = await sql`
          SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total 
          FROM transactions 
          WHERE type = 'mint' AND xrpl_transaction_hash IS NOT NULL
        `;
        const burnResult = await sql`
          SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total 
          FROM transactions 
          WHERE type = 'burn' AND xrpl_transaction_hash IS NOT NULL
        `;

        const stats = {
          totalUsers,
          totalSupply,
          totalBalance: totalSupply,
          monthlyVolume: 0,
          pendingOperations: 0,
          pendingDeposits: 0,
          blockchain: {
            totalMints: parseInt(mintResult[0]?.count || '0'),
            totalMintAmount: parseFloat(mintResult[0]?.total || '0'),
            totalBurns: parseInt(burnResult[0]?.count || '0'),
            totalBurnAmount: parseFloat(burnResult[0]?.total || '0')
          }
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ stats })
        };
      }

      if (action === 'getBlockchainActivity') {
        const xrplTransactions = await sql`
          SELECT 
            xrpl_transaction_hash,
            type,
            amount,
            from_wallet,
            to_wallet,
            created_at,
            metadata
          FROM transactions 
          WHERE xrpl_transaction_hash IS NOT NULL
          AND xrpl_transaction_hash NOT LIKE 'transfer_%'
          ORDER BY created_at DESC
          LIMIT 50
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            transactions: xrplTransactions.map(tx => ({
              ...tx,
              amount: parseFloat(tx.amount || '0'),
              created_at: new Date(tx.created_at).toISOString()
            }))
          })
        };
      }

      if (action === 'getPendingOperations') {
        const result = await sql`
          SELECT * FROM pending_operations 
          WHERE status = 'pending' 
          ORDER BY created_at DESC
          LIMIT 50
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ operations: result })
        };
      }

      if (action === 'getAllUsers') {
        const result = await sql`
          SELECT 
            id,
            wallet_address,
            role,
            balance,
            username,
            display_name,
            email,
            is_active,
            created_at,
            updated_at
          FROM users 
          ORDER BY created_at DESC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ users: result })
        };
      }

      if (action === 'getUserDeposits') {
        const { user_id } = body;
        const result = await sql`
          SELECT 
            id,
            amount,
            status,
            buyer_phone,
            buyer_name,
            reference,
            created_at
          FROM pending_deposits 
          WHERE user_id = ${user_id}
          ORDER BY created_at DESC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ deposits: result })
        };
      }

      if (action === 'updateUserRole') {
        const { user_id, new_role } = body;
        
        await sql`
          UPDATE users 
          SET role = ${new_role}, updated_at = NOW()
          WHERE id = ${user_id}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      if (action === 'toggleUserStatus') {
        const { user_id } = body;
        
        await sql`
          UPDATE users 
          SET is_active = NOT is_active, updated_at = NOW()
          WHERE id = ${user_id}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      if (action === 'approveOperation') {
        const { operation_id, admin_id } = body;
        
        // Add approval record
        await sql`
          INSERT INTO operation_approvals (operation_id, approved_by)
          VALUES (${operation_id}, ${admin_id})
          ON CONFLICT (operation_id, approved_by) DO NOTHING
        `;
        
        // Update approval count
        await sql`
          UPDATE pending_operations 
          SET current_approvals = (
            SELECT COUNT(*) FROM operation_approvals WHERE operation_id = ${operation_id}
          )
          WHERE id = ${operation_id}
        `;
        
        // Check if operation should be executed
        const opResult = await sql`
          SELECT * FROM pending_operations 
          WHERE id = ${operation_id} AND current_approvals >= required_approvals
        `;
        
        if (opResult.length > 0) {
          // Execute the operation (simplified - would need full implementation)
          await sql`
            UPDATE pending_operations 
            SET status = 'approved' 
            WHERE id = ${operation_id}
          `;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      if (action === 'mintTokens') {
        try {
          // Calculate USD value (1 USD = ~2600 TZS)
          const usdValue = amount / 2600
          
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

      if (action === 'updateBalance') {
        const { user_id, amount, operation } = body;
        
        if (operation === 'add') {
          // Ensure required columns exist for modern auth
          await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS balance DECIMAL(20,8) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
            ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
            ADD COLUMN IF NOT EXISTS wallet_secret VARCHAR(255),
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) DEFAULT 'user'
          `;
          // Add to user balance
          await sql`
            UPDATE users 
            SET balance = CAST(balance AS DECIMAL) + ${amount},
                updated_at = NOW()
            WHERE id = ${user_id}
          `;
          // Record transaction
          await sql`
            INSERT INTO transactions (user_id, type, amount, created_at)
            VALUES (${user_id}, 'deposit', ${amount}, NOW())
          `;
        } else if (operation === 'subtract') {
          // Subtract from user balance
          await sql`
            UPDATE users 
            SET balance = CAST(balance AS DECIMAL) - ${amount},
                updated_at = NOW()
            WHERE id = ${user_id}
          `;
          
          // Record transaction
          await sql`
            INSERT INTO transactions (user_id, type, amount, created_at)
            VALUES (${user_id}, 'send', ${amount}, NOW())
          `;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      if (action === 'getUserTransactions') {
        try {
          // Get transactions from transactions table (XRPL mints/burns + transfers)
          const transactionResult = await sql`
            SELECT 
              id,
              type,
              amount,
              xrpl_transaction_hash,
              to_wallet,
              from_wallet,
              metadata,
              created_at
            FROM transactions 
            WHERE to_wallet = ${user_id} OR from_wallet = ${user_id} OR user_id = ${user_id}
            ORDER BY created_at DESC LIMIT 20
          `;
          
          // Get deposits from pending_deposits table (mobile money)
          const depositResult = await sql`
            SELECT 
              id,
              amount,
              status,
              buyer_phone,
              buyer_name,
              reference,
              created_at,
              'deposit' as type
            FROM pending_deposits 
            WHERE user_id = ${user_id}
            ORDER BY created_at DESC LIMIT 20
          `;
          
          // Get user-to-user transfers - check if columns exist first
          let transferResult: any[] = [];
          try {
            transferResult = await sql`
              SELECT 
                id,
                amount,
                type,
                description,
                reference,
                status,
                created_at
              FROM transactions 
              WHERE type = 'transfer' AND (description LIKE '%' || ${user_id} || '%')
              ORDER BY created_at DESC LIMIT 20
            `;
          } catch (e) {
            // If transfer columns don't exist, skip transfers
            transferResult = [];
          }
          
          // Combine and format all transactions
          const allTransactions = [
            // XRPL transactions (mints/burns + transfers)
            ...transactionResult.map(tx => {
              // Check if this is a transfer transaction by looking at metadata
              let actualType = tx.type;
              let description = `${tx.type} - ${tx.xrpl_transaction_hash ? 'XRPL' : 'Internal'}`;
              
              if (tx.metadata && typeof tx.metadata === 'object') {
                const metadata = tx.metadata;
                if (metadata.type === 'transfer_out') {
                  actualType = 'send';
                  description = `Sent to ${metadata.recipient_username}${metadata.note ? ` - ${metadata.note}` : ''}`;
                } else if (metadata.type === 'transfer_in') {
                  actualType = 'receive';
                  description = `Received from ${metadata.sender_username}${metadata.note ? ` - ${metadata.note}` : ''}`;
                }
              }
              
              return {
                id: tx.id.toString(),
                type: actualType,
                amount: parseFloat(tx.amount),
                date: new Date(tx.created_at).toISOString(),
                status: 'completed',
                description: description
              };
            }),
            // Mobile money deposits
            ...depositResult.map(dep => ({
              id: dep.id.toString(),
              type: 'deposit',
              amount: parseFloat(dep.amount),
              date: new Date(dep.created_at).toISOString(),
              status: dep.status,
              description: `Mobile money deposit - ${dep.buyer_phone} (${dep.buyer_name})`
            })),
            // User transfers
            ...transferResult.map(tx => ({
              id: tx.id.toString(),
              type: tx.type || 'transfer',
              amount: parseFloat(tx.amount),
              date: new Date(tx.created_at).toISOString(),
              status: tx.status || 'completed',
              description: tx.description || 'Transfer transaction'
            }))
          ];
          
          // Sort by date (newest first)
          allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              transactions: allTransactions.slice(0, 20),
              pendingDeposits: depositResult.filter(d => d.status === 'pending').length,
              monthlySpending: 0
            })
          };
        } catch (error: any) {
          console.error('getUserTransactions error:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch transactions', details: error.message })
          };
        }
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
