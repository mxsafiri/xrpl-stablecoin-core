import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { xrplService } from './xrpl-service'

const sql = neon(process.env.DATABASE_URL!)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

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

    const body = JSON.parse(event.body || '{}')
    const path = event.path.replace('/.netlify/functions/auth', '')

    // Modern signup endpoint
    if (event.httpMethod === 'POST' && path === '/signup') {
      const { fullName, username, nationalId, email, password } = body

      // Validate required fields
      if (!fullName || !username || !nationalId || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'All fields are required' })
        }
      }

      // Validate username format (Name.TZS)
      if (!username.endsWith('.TZS') || username.length < 5) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username must be in format Name.TZS' })
        }
      }

      // Check if username already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE username = ${username}
      `
      if (existingUser.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username already taken' })
        }
      }

      // Check if email already exists
      const existingEmail = await sql`
        SELECT id FROM users WHERE email = ${email}
      `
      if (existingEmail.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email already registered' })
        }
      }

      // Create XRPL wallet for user
      const wallet = await xrplService.createWallet()
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user in database
      const result = await sql`
        INSERT INTO users (
          username, 
          display_name, 
          email, 
          national_id,
          password_hash,
          wallet_address,
          wallet_secret,
          role,
          balance,
          is_active,
          created_at
        ) 
        VALUES (
          ${username}, 
          ${fullName}, 
          ${email}, 
          ${nationalId},
          ${hashedPassword},
          ${wallet.address},
          ${wallet.secret},
          'user',
          0,
          true,
          NOW()
        ) 
        RETURNING id, username, display_name, email, wallet_address, role, balance, is_active
      `

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: result[0].id, 
          username: result[0].username,
          role: result[0].role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: result[0]
        })
      }
    }

    // Modern login endpoint
    if (event.httpMethod === 'POST' && path === '/login') {
      const { username, password } = body

      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username and password are required' })
        }
      }

      // Find user by username
      const result = await sql`
        SELECT id, username, display_name, email, password_hash, wallet_address, role, balance, is_active
        FROM users 
        WHERE username = ${username}
      `

      if (result.length === 0) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid username or password' })
        }
      }

      const user = result[0]

      // Check if account is active
      if (!user.is_active) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Account is deactivated' })
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid username or password' })
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Remove password hash from response
      const { password_hash, ...userResponse } = user

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: userResponse
        })
      }
    }

    // Legacy wallet-based auth (keeping for backward compatibility)
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
