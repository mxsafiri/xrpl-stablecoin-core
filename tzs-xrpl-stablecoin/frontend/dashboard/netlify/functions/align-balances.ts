import { Handler, HandlerResponse } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { getSecureCorsHeaders } from './cors-config'
import { xrplService } from './xrpl-service'

const sql = neon(process.env.DATABASE_URL!)

export const handler: Handler = async (event, context): Promise<HandlerResponse> => {
  const headers = getSecureCorsHeaders(event.headers.origin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Get all users with balances
    const users = await sql`
      SELECT id, username, balance, wallet_address 
      FROM users 
      WHERE balance > 0
    `

    const alignmentResults = []

    for (const user of users) {
      if (!user.wallet_address) continue

      // Get actual XRPL token balance
      const xrplBalance = await xrplService.getTokenBalance(user.wallet_address)
      const dbBalance = parseFloat(user.balance || '0')

      if (Math.abs(xrplBalance - dbBalance) > 0.01) {
        // Update database to match XRPL
        await sql`
          UPDATE users 
          SET balance = ${xrplBalance.toString()}
          WHERE id = ${user.id}
        `

        alignmentResults.push({
          username: user.username,
          oldBalance: dbBalance,
          newBalance: xrplBalance,
          difference: dbBalance - xrplBalance
        })
      }
    }

    // Get updated stats
    const updatedUsers = await sql`SELECT COUNT(*) as count FROM users WHERE balance > 0`
    const updatedSupply = await sql`SELECT SUM(CAST(balance AS DECIMAL)) as total FROM users`
    const mintStats = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total 
      FROM transactions 
      WHERE type = 'mint' AND xrpl_transaction_hash IS NOT NULL
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Balance alignment completed',
        alignments: alignmentResults,
        updatedStats: {
          totalUsers: parseInt(updatedUsers[0]?.count || '0'),
          totalSupply: parseFloat(updatedSupply[0]?.total || '0'),
          totalMints: parseInt(mintStats[0]?.count || '0'),
          totalMintAmount: parseFloat(mintStats[0]?.total || '0')
        }
      })
    }
  } catch (error) {
    console.error('Balance alignment error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to align balances' })
    }
  }
}
