import { Handler } from '@netlify/functions'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // Limit connections for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

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
    const body = JSON.parse(event.body || '{}')
    const { walletAddress, action } = body

    if (event.httpMethod === 'POST' && action === 'login') {
      // Login user
      const result = await pool.query('SELECT * FROM users WHERE wallet_address = $1', [walletAddress])
      
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Wallet not found' })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result.rows[0],
          isAdmin: result.rows[0].role === 'admin'
        })
      }
    }

    if (event.httpMethod === 'POST' && action === 'register') {
      // Register new user
      const { role = 'user' } = body
      
      const result = await pool.query(
        'INSERT INTO users (wallet_address, role, balance, created_at) VALUES ($1, $2, 0, NOW()) ON CONFLICT (wallet_address) DO NOTHING RETURNING *',
        [walletAddress, role]
      )
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result.rows[0]
        })
      }
    }

    if (event.httpMethod === 'POST' && action === 'admin-login') {
      // Admin login with predefined admin wallet
      const adminAddress = 'rAdminWalletAddressForTesting123456789'
      const result = await pool.query('SELECT * FROM users WHERE wallet_address = $1 AND role = $2', [adminAddress, 'admin'])
      
      if (result.rows.length === 0) {
        // Create admin user if doesn't exist
        const insertResult = await pool.query(
          'INSERT INTO users (wallet_address, role, balance, created_at) VALUES ($1, $2, 0, NOW()) RETURNING *',
          [adminAddress, 'admin']
        )
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            user: insertResult.rows[0],
            isAdmin: true
          })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result.rows[0],
          isAdmin: true
        })
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    }

  } catch (error) {
    console.error('Auth function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
