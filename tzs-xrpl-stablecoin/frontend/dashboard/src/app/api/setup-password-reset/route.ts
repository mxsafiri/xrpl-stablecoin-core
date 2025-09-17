import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    // Create password_reset_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email)
    `)

    // Clean up expired tokens
    await client.query(`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW() OR used = TRUE
    `)

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset table created successfully' 
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to setup password reset table' },
      { status: 500 }
    )
  }
}
