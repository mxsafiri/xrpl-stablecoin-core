import { Handler, HandlerResponse } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { getSecureCorsHeaders } from './cors-config'

const sql = neon(process.env.DATABASE_URL!)

export const handler: Handler = async (event, context): Promise<HandlerResponse> => {
  const headers = getSecureCorsHeaders(event.headers.origin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Get detailed user balances
    const users = await sql`
      SELECT id, username, display_name, balance, wallet_address, created_at 
      FROM users 
      WHERE balance > 0 
      ORDER BY CAST(balance AS DECIMAL) DESC
    `

    // Get all transactions
    const transactions = await sql`
      SELECT type, amount, xrpl_transaction_hash, from_wallet, to_wallet, created_at, metadata
      FROM transactions 
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Get deposits
    const deposits = await sql`
      SELECT amount, status, created_at, reference_id
      FROM pending_deposits 
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Calculate totals
    const totalBalance = users.reduce((sum, user) => sum + parseFloat(user.balance || '0'), 0)
    const totalMints = transactions.filter(tx => tx.type === 'mint' && tx.xrpl_transaction_hash).length
    const totalMintAmount = transactions
      .filter(tx => tx.type === 'mint' && tx.xrpl_transaction_hash)
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          totalUsers: users.length,
          totalBalance,
          totalMints,
          totalMintAmount
        },
        users: users.map(user => ({
          username: user.username,
          balance: parseFloat(user.balance || '0'),
          created: user.created_at
        })),
        recentTransactions: transactions.map(tx => ({
          type: tx.type,
          amount: parseFloat(tx.amount || '0'),
          hash: tx.xrpl_transaction_hash,
          created: tx.created_at
        })),
        recentDeposits: deposits.map(dep => ({
          amount: parseFloat(dep.amount || '0'),
          status: dep.status,
          reference: dep.reference_id,
          created: dep.created_at
        }))
      })
    }
  } catch (error) {
    console.error('Debug stats error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get debug stats' })
    }
  }
}
