import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL!)

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
    if (event.httpMethod === 'GET') {
      // Get all accounts with non-zero balances that need migration
      const fundedAccounts = await sql`
        SELECT wallet_address, balance, display_name, email, role
        FROM users 
        WHERE (balance > 0 OR balance IS NULL) 
        AND (username IS NULL OR password_hash IS NULL)
        ORDER BY balance DESC NULLS LAST
      `

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accounts: fundedAccounts,
          count: fundedAccounts.length,
          message: `Found ${fundedAccounts.length} funded accounts that need migration`
        })
      }
    }

    if (event.httpMethod === 'POST') {
      const { walletAddress, username, nationalId, password } = JSON.parse(event.body || '{}')

      if (!walletAddress || !username || !nationalId || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: walletAddress, username, nationalId, password' })
        }
      }

      // Check if account exists and has balance
      const existingUser = await sql`
        SELECT * FROM users 
        WHERE wallet_address = ${walletAddress} 
        AND (balance > 0 OR balance IS NULL)
      `
      
      if (existingUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Funded account not found with this wallet address' })
        }
      }

      // Check if already migrated
      if (existingUser[0].username && existingUser[0].password_hash) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Account already migrated' })
        }
      }

      // Check if username is already taken
      const usernameCheck = await sql`SELECT id FROM users WHERE username = ${username}`
      if (usernameCheck.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username already taken' })
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Update account with modern auth fields
      const updatedUser = await sql`
        UPDATE users 
        SET 
          username = ${username},
          national_id = ${nationalId},
          password_hash = ${passwordHash},
          display_name = COALESCE(display_name, ${username.split('.')[0]}),
          email = COALESCE(email, ${username.toLowerCase().replace('.', '')}@tzs.com),
          is_active = true
        WHERE wallet_address = ${walletAddress}
        RETURNING *
      `

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Funded account migrated successfully! You can now log in with your username and password.',
          user: {
            id: updatedUser[0].id,
            username: updatedUser[0].username,
            wallet_address: updatedUser[0].wallet_address,
            balance: updatedUser[0].balance,
            role: updatedUser[0].role
          }
        })
      }
    }

  } catch (error: any) {
    console.error('Migration failed:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Migration failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Ensure all code paths return a response
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}
