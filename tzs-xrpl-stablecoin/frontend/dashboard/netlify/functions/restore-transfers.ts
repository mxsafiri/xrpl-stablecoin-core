import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { getSecureCorsHeaders } from './cors-config'

const sql = neon(process.env.DATABASE_URL!)

export const handler: Handler = async (event, context) => {
  const headers = getSecureCorsHeaders(event.headers.origin)
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { action } = JSON.parse(event.body || '{}')

    if (action === 'fixTransferBalances') {
      // Find the user with 5000 balance (your account)
      const mainUserResult = await sql`
        SELECT id, username, display_name, balance
        FROM users 
        WHERE role = 'user' 
        ORDER BY CAST(balance AS DECIMAL) DESC
        LIMIT 1
      `

      if (mainUserResult.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Main user not found' })
        }
      }

      const mainUser = mainUserResult[0]
      const mainUserId = mainUser.id

      // Get all transfer transactions from your account
      // Based on the transfer.ts function, transfers are stored with metadata containing recipient info
      const transfers = await sql`
        SELECT 
          amount,
          created_at,
          metadata,
          to_wallet
        FROM transactions
        WHERE metadata::text LIKE ${'%"sender_id":"' + mainUserId + '"%'}
        AND type = 'mint'
        AND metadata::text LIKE '%transfer%'
        ORDER BY created_at ASC
      `

      // Calculate total sent
      const totalSent = transfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0)

      // Calculate correct balances for each recipient
      const recipientBalances: { [key: string]: number } = {}
      transfers.forEach(transfer => {
        // Extract recipient info from metadata
        const metadata = transfer.metadata
        if (metadata && metadata.recipient_id) {
          const recipientId = metadata.recipient_id
          const amount = parseFloat(transfer.amount || '0')
          recipientBalances[recipientId] = (recipientBalances[recipientId] || 0) + amount
        }
      })

      // Update recipient balances
      const updates = []
      for (const [recipientId, balance] of Object.entries(recipientBalances)) {
        await sql`
          UPDATE users 
          SET balance = ${balance}
          WHERE id = ${recipientId}
        `
        
        const recipient = await sql`
          SELECT username, display_name FROM users WHERE id = ${recipientId}
        `
        
        updates.push({
          recipientId,
          recipientName: recipient[0]?.display_name || recipient[0]?.username || 'Unknown',
          balance
        })
      }

      // Update your balance: 5000 (deposit) - total sent
      const correctMainBalance = 5000 - totalSent
      await sql`
        UPDATE users 
        SET balance = ${correctMainBalance}
        WHERE id = ${mainUserId}
      `

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Transfer balances restored successfully',
          mainUser: {
            id: mainUserId,
            name: mainUser.display_name || mainUser.username || 'You',
            originalBalance: parseFloat(mainUser.balance),
            newBalance: correctMainBalance,
            totalSent
          },
          recipients: updates,
          summary: {
            transferCount: transfers.length,
            recipientCount: Object.keys(recipientBalances).length,
            totalSent,
            yourNewBalance: correctMainBalance
          }
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Restore transfers error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
