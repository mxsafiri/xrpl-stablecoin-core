import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { action, email, token, password } = await request.json()

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    switch (action) {
      case 'request': {
        // Check if user exists
        const userResult = await client.query(
          'SELECT id, email FROM users WHERE email = $1',
          [email]
        )

        if (userResult.rows.length === 0) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          )
        }

        // Generate secure token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Clean up old tokens for this email
        await client.query(
          'DELETE FROM password_reset_tokens WHERE email = $1',
          [email]
        )

        // Store new token
        await client.query(
          'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
          [email, resetToken, expiresAt]
        )

        await client.end()

        // In production, send email here
        console.log(`Password reset link: http://localhost:3002/reset-password?token=${resetToken}`)

        return NextResponse.json({
          success: true,
          message: 'Password reset link sent to your email'
        })
      }

      case 'verify': {
        const tokenResult = await client.query(
          'SELECT email, expires_at, used FROM password_reset_tokens WHERE token = $1',
          [token]
        )

        if (tokenResult.rows.length === 0) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 400 }
          )
        }

        const tokenData = tokenResult.rows[0]

        if (tokenData.used) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Token already used' },
            { status: 400 }
          )
        }

        if (new Date() > new Date(tokenData.expires_at)) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Token expired' },
            { status: 400 }
          )
        }

        await client.end()

        return NextResponse.json({
          success: true,
          email: tokenData.email
        })
      }

      case 'reset': {
        if (!password || password.length < 8) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Password must be at least 8 characters' },
            { status: 400 }
          )
        }

        // Verify token
        const tokenResult = await client.query(
          'SELECT email, expires_at, used FROM password_reset_tokens WHERE token = $1',
          [token]
        )

        if (tokenResult.rows.length === 0) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 400 }
          )
        }

        const tokenData = tokenResult.rows[0]

        if (tokenData.used) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Token already used' },
            { status: 400 }
          )
        }

        if (new Date() > new Date(tokenData.expires_at)) {
          await client.end()
          return NextResponse.json(
            { success: false, error: 'Token expired' },
            { status: 400 }
          )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Update user password
        await client.query(
          'UPDATE users SET password = $1 WHERE email = $2',
          [hashedPassword, tokenData.email]
        )

        // Mark token as used
        await client.query(
          'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
          [token]
        )

        await client.end()

        return NextResponse.json({
          success: true,
          message: 'Password reset successfully'
        })
      }

      default:
        await client.end()
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
