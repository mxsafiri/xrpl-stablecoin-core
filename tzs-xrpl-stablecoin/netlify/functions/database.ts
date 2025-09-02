import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

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
      const result = await sql`
        SELECT t.*, u.wallet_address 
        FROM transactions t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC 
        LIMIT 50
      `
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    if (event.path.includes('/pending-operations')) {
      const result = await sql`SELECT * FROM multisig_operations WHERE status = 'pending' ORDER BY created_at DESC`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    if (event.httpMethod === 'GET' && path === '/wallet-balances') {
      const result = await sql`SELECT wallet_address, balance FROM users`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      }
    }

    if (event.path.includes('/collateral-balance')) {
      const result = await sql`SELECT SUM(amount) as total FROM collateral_ledger WHERE type = 'deposit'`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ total: result[0]?.total || 0 })
      }
    }

    if (event.httpMethod === 'POST' && path.startsWith('/approve/')) {
      const operationId = path.split('/')[2]
      const { userWallet } = JSON.parse(event.body || '{}')
      
      // Check if user is admin
      const userCheck = await sql`SELECT role FROM users WHERE wallet_address = ${userWallet}`
      if (userCheck.length === 0 || userCheck[0].role !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        }
      }

      // Update operation status
      await sql`
        UPDATE multisig_operations 
        SET status = 'approved', approved_by = ${userWallet}, approved_at = NOW() 
        WHERE id = ${operationId}
      `
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
