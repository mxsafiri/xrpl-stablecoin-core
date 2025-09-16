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

    if (action === 'checkTransactions') {
      // Get the main user account (the one we just reset to 5000)
      const mainUser = await sql`
        SELECT id, wallet_address, balance, username, display_name
        FROM users 
        WHERE role = 'user' AND CAST(balance AS DECIMAL) = 5000
        LIMIT 1
      `

      if (mainUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Main user not found' })
        }
      }

      const mainUserId = mainUser[0].id

      // Get all transactions from this user to other users
      const outgoingTransactions = await sql`
        SELECT 
          t.*,
          u.username as recipient_username,
          u.display_name as recipient_name,
          u.balance as current_recipient_balance
        FROM transactions t
        LEFT JOIN users u ON t.recipient_id = u.id
        WHERE t.user_id = ${mainUserId} 
        AND t.type = 'transfer'
        ORDER BY t.created_at DESC
      `

      // Get all incoming transactions to other users from this user
      const recipientBalances = await sql`
        SELECT 
          recipient_id,
          u.username,
          u.display_name,
          u.balance as current_balance,
          SUM(CAST(t.amount AS DECIMAL)) as total_received
        FROM transactions t
        LEFT JOIN users u ON t.recipient_id = u.id
        WHERE t.user_id = ${mainUserId} 
        AND t.type = 'transfer'
        AND t.recipient_id IS NOT NULL
        GROUP BY recipient_id, u.username, u.display_name, u.balance
      `

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          mainUser: mainUser[0],
          outgoingTransactions,
          recipientBalances,
          summary: {
            totalSent: outgoingTransactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0),
            recipientCount: recipientBalances.length
          }
        })
      }
    }

    if (action === 'restoreRecipientBalances') {
      // Get the main user
      const mainUser = await sql`
        SELECT id FROM users 
        WHERE role = 'user' AND CAST(balance AS DECIMAL) = 5000
        LIMIT 1
      `

      if (mainUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Main user not found' })
        }
      }

      const mainUserId = mainUser[0].id

      // Calculate correct balances for recipients based on transfers received
      const recipientBalances = await sql`
        SELECT 
          recipient_id,
          SUM(CAST(amount AS DECIMAL)) as total_received
        FROM transactions
        WHERE user_id = ${mainUserId} 
        AND type = 'transfer'
        AND recipient_id IS NOT NULL
        GROUP BY recipient_id
      `

      const updates = []
      
      // Update each recipient's balance
      for (const recipient of recipientBalances) {
        await sql`
          UPDATE users 
          SET balance = ${recipient.total_received}
          WHERE id = ${recipient.recipient_id}
        `
        updates.push({
          userId: recipient.recipient_id,
          newBalance: recipient.total_received
        })
      }

      // Also need to adjust the main user's balance
      // Main user should have: 5000 (deposit) - total_sent
      const totalSent = recipientBalances.reduce((sum, r) => sum + parseFloat(r.total_received), 0)
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
          message: 'Recipient balances restored',
          updates,
          mainUserNewBalance: correctMainBalance,
          totalSent
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Fix balances error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
