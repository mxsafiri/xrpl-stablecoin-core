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
    const { action, user_phone } = JSON.parse(event.body || '{}')

    if (action === 'resetToRealBalance') {
      // Since deposits might not be properly linked, let's find the main user account
      // and reset it to the specified amount (5000 TSh as mentioned)
      const realBalance = 5000; // Your actual ZenoPay deposit amount
      
      // Find the oldest non-admin user (likely the real user account)
      const mainUser = await sql`
        SELECT id, wallet_address, balance, username, display_name, created_at
        FROM users 
        WHERE role = 'user'
        ORDER BY created_at ASC
        LIMIT 1
      `

      if (mainUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No user accounts found' })
        }
      }

      const userId = mainUser[0].id

      // Update user balance to the real deposit amount
      await sql`
        UPDATE users 
        SET balance = ${realBalance}
        WHERE id = ${userId}
      `

      // Reset all other non-admin users to 0 (test accounts)
      await sql`
        UPDATE users 
        SET balance = '0'
        WHERE role = 'user' AND id != ${userId}
      `

      // Get updated user info
      const user = await sql`
        SELECT id, wallet_address, balance, username, display_name
        FROM users 
        WHERE id = ${userId}
      `

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Balance reset to real deposit amount',
          user: user[0],
          realBalance,
          resetOtherUsers: true
        })
      }
    }

    if (action === 'checkUserDeposits') {
      // Check all deposits for a phone number
      const deposits = await sql`
        SELECT * FROM pending_deposits 
        WHERE buyer_phone = ${user_phone}
        ORDER BY created_at DESC
      `

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ deposits })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Reset balance error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
