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
    // Test database connection first
    if (!process.env.DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_URL not configured' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { walletAddress, action, username, displayName, email } = body

    if (event.httpMethod === 'POST' && action === 'login') {
      // Login user
      const result = await sql`SELECT * FROM users WHERE wallet_address = ${walletAddress}`
      
      if (result.length === 0) {
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
          user: result[0],
          isAdmin: result[0].role === 'admin'
        })
      }
    }

    if (event.httpMethod === 'POST' && action === 'register') {
      // Register new user
      const { role = 'user' } = body
      
      // Ensure required columns exist
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS balance DECIMAL(20,8) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) DEFAULT 'user'
      `

      // Create pending operations table for multi-sig workflow
      await sql`
        CREATE TABLE IF NOT EXISTS pending_operations (
          id SERIAL PRIMARY KEY,
          operation_type VARCHAR(20) NOT NULL,
          amount DECIMAL(20,8) NOT NULL,
          usd_value DECIMAL(20,2) NOT NULL,
          destination_wallet VARCHAR(100),
          source_wallet VARCHAR(100),
          reference TEXT,
          requested_by VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'pending',
          required_approvals INTEGER DEFAULT 2,
          current_approvals INTEGER DEFAULT 0
        )
      `

      // Create operation approvals table
      await sql`
        CREATE TABLE IF NOT EXISTS operation_approvals (
          id SERIAL PRIMARY KEY,
          operation_id INTEGER REFERENCES pending_operations(id),
          approved_by VARCHAR(100) NOT NULL,
          approved_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(operation_id, approved_by)
        )
      `

      // Create system settings table for configurable thresholds
      await sql`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(50) UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Insert default threshold setting
      await sql`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ('multisig_threshold_usd', '5000')
        ON CONFLICT (setting_key) DO NOTHING
      `

      // Check if username is already taken
      if (username) {
        const usernameCheck = await sql`SELECT id FROM users WHERE username = ${username}`
        if (usernameCheck.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Username already taken' })
          }
        }
      }
      
      const result = await sql`
        INSERT INTO users (wallet_address, role, balance, username, display_name, email, created_at) 
        VALUES (${walletAddress}, ${role}, 0, ${username}, ${displayName}, ${email}, NOW()) 
        ON CONFLICT (wallet_address) DO NOTHING 
        RETURNING *
      `
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result[0]
        })
      }
    }

    if (event.httpMethod === 'POST' && action === 'admin-login') {
      // Admin login with predefined admin wallet
      const adminAddress = 'rAdminWalletAddressForTesting123456789'
      const result = await sql`SELECT * FROM users WHERE wallet_address = ${adminAddress} AND role = 'admin'`
      
      if (result.length === 0) {
        // Create admin user if doesn't exist
        const insertResult = await sql`
          INSERT INTO users (wallet_address, role, balance, created_at) 
          VALUES (${adminAddress}, 'admin', 0, NOW()) 
          RETURNING *
        `
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            user: insertResult[0],
            isAdmin: true
          })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result[0],
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
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  }
}
