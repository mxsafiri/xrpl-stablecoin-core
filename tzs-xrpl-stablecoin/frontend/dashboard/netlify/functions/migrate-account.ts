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
    const { walletAddress, username, nationalId, password } = JSON.parse(event.body || '{}')

    if (!walletAddress || !username || !nationalId || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: walletAddress, username, nationalId, password' })
      }
    }

    // Check if account exists
    const existingUser = await sql`SELECT * FROM users WHERE wallet_address = ${walletAddress}`
    
    if (existingUser.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Account not found with this wallet address' })
      }
    }

    // Check if username is already taken
    const usernameCheck = await sql`SELECT id FROM users WHERE username = ${username} AND wallet_address != ${walletAddress}`
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
    const displayName = username.split('.')[0]
    const defaultEmail = `${username.toLowerCase().replace('.', '')}@tzs.com`
    
    const updatedUser = await sql`
      UPDATE users 
      SET 
        username = ${username},
        national_id = ${nationalId},
        password_hash = ${passwordHash},
        display_name = COALESCE(display_name, ${displayName}),
        email = COALESCE(email, ${defaultEmail}),
        is_active = true
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account migrated successfully! You can now log in with your username and password.',
        user: updatedUser[0]
      })
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
}
