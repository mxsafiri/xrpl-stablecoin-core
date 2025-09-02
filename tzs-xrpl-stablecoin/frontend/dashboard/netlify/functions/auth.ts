import { Handler } from '@netlify/functions'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
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
    const { walletAddress } = JSON.parse(event.body || '{}')

    if (event.httpMethod === 'POST' && event.path.includes('/login')) {
      // Login user
      const query = 'SELECT * FROM users WHERE wallet_address = $1'
      const result = await pool.query(query, [walletAddress])
      
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

    if (event.httpMethod === 'POST' && event.path.includes('/register')) {
      // Register new user
      const { role = 'user' } = JSON.parse(event.body || '{}')
      
      const query = `
        INSERT INTO users (wallet_address, role, balance, created_at) 
        VALUES ($1, $2, 0, NOW()) 
        ON CONFLICT (wallet_address) DO NOTHING
        RETURNING *
      `
      const result = await pool.query(query, [walletAddress, role])
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result.rows[0]
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
