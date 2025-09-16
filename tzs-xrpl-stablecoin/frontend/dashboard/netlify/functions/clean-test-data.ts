// Netlify function to clean up test data and check real balances
import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { action } = JSON.parse(event.body || '{}')

    if (action === 'checkBalances') {
      // Get all users with their balances
      const users = await sql`
        SELECT 
          id,
          wallet_address,
          role,
          balance,
          username,
          display_name,
          created_at
        FROM users 
        ORDER BY CAST(balance AS DECIMAL) DESC
      `

      // Get recent deposits
      const deposits = await sql`
        SELECT 
          amount,
          status,
          buyer_phone,
          buyer_name,
          reference,
          created_at,
          user_id
        FROM pending_deposits 
        ORDER BY created_at DESC 
        LIMIT 20
      `

      // Get recent transactions
      const transactions = await sql`
        SELECT 
          amount,
          type,
          user_id,
          created_at,
          metadata
        FROM transactions 
        ORDER BY created_at DESC 
        LIMIT 20
      `

      return {
        statusCode: 200,
        body: JSON.stringify({
          users,
          deposits,
          transactions,
          summary: {
            totalUsers: users.filter(u => u.role !== 'admin').length,
            totalUserBalance: users
              .filter(u => u.role !== 'admin')
              .reduce((sum, u) => sum + parseFloat(u.balance || '0'), 0),
            totalAdminBalance: users
              .filter(u => u.role === 'admin')
              .reduce((sum, u) => sum + parseFloat(u.balance || '0'), 0),
            totalDeposits: deposits
              .filter(d => d.status === 'completed')
              .reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0)
          }
        })
      }
    }

    if (action === 'resetTestData') {
      // This would reset balances to only real deposits
      // Be very careful with this - only run if you're sure
      
      // First, let's identify the real user (you)
      const realUser = await sql`
        SELECT id FROM users 
        WHERE role = 'user' 
        ORDER BY created_at ASC 
        LIMIT 1
      `

      if (realUser.length > 0) {
        const userId = realUser[0].id

        // Reset this user's balance to 5000 (your actual deposit)
        await sql`
          UPDATE users 
          SET balance = '5000'
          WHERE id = ${userId}
        `

        // Reset all other non-admin users to 0
        await sql`
          UPDATE users 
          SET balance = '0'
          WHERE role = 'user' AND id != ${userId}
        `

        return {
          statusCode: 200,
          body: JSON.stringify({ 
            message: 'Test data reset completed',
            realUserId: userId,
            realUserBalance: 5000
          })
        }
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
