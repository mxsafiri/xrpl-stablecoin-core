import { Handler } from '@netlify/functions'

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
    // Test environment variables
    const dbUrl = process.env.DATABASE_URL
    
    if (!dbUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DATABASE_URL not found',
          env: Object.keys(process.env).filter(key => key.includes('DATABASE'))
        })
      }
    }

    // Test basic database connection without pool
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users')
    await pool.end()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result.rows[0],
        message: 'Database connection successful'
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorType = error instanceof Error ? error.constructor.name : typeof error
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        stack: errorStack,
        type: errorType
      })
    }
  }
}
