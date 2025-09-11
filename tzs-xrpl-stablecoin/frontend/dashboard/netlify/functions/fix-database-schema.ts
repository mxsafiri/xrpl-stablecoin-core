import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'

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
    if (!process.env.DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_URL not configured' })
      }
    }

    // Add missing columns to users table for modern auth
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS wallet_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Database schema updated successfully' 
      })
    }

  } catch (error: any) {
    console.error('Database schema update failed:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database schema update failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}
