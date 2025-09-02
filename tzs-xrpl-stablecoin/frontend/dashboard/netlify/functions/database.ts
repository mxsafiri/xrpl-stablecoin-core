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
    const path = event.path.replace('/.netlify/functions/database', '')

    if (event.httpMethod === 'GET' && path === '/transactions') {
      const query = `
        SELECT t.*, u.wallet_address as user_wallet 
        FROM transactions t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC 
        LIMIT 50
      `
      const result = await pool.query(query)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      }
    }

    if (event.httpMethod === 'GET' && path === '/pending-operations') {
      const query = `
        SELECT mo.*, u.wallet_address as created_by_wallet 
        FROM multisig_operations mo 
        JOIN users u ON mo.created_by = u.id 
        WHERE mo.status = 'pending'
        ORDER BY mo.created_at DESC
      `
      const result = await pool.query(query)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      }
    }

    if (event.httpMethod === 'GET' && path === '/wallet-balances') {
      const query = 'SELECT wallet_address, balance FROM users'
      const result = await pool.query(query)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      }
    }

    if (event.httpMethod === 'GET' && path === '/collateral-balance') {
      const query = 'SELECT SUM(amount) as total FROM collateral_ledger WHERE type = \'deposit\''
      const result = await pool.query(query)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ total: result.rows[0]?.total || 0 })
      }
    }

    if (event.httpMethod === 'POST' && path.startsWith('/approve/')) {
      const operationId = path.split('/')[2]
      const { userWallet } = JSON.parse(event.body || '{}')
      
      // Verify user is admin
      const userQuery = 'SELECT role FROM users WHERE wallet_address = $1'
      const userResult = await pool.query(userQuery, [userWallet])
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only admins can approve operations' })
        }
      }

      const query = 'UPDATE multisig_operations SET status = \'approved\' WHERE id = $1'
      await pool.query(query, [operationId])
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    }

  } catch (error) {
    console.error('Database function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
