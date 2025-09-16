import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSecureCorsHeaders } from './cors-config';

const sql = neon(process.env.DATABASE_URL!);

// Simple email service (you can replace with SendGrid, Mailgun, etc.)
const sendResetEmail = async (email: string, resetToken: string, username: string) => {
  const resetUrl = `https://www.tumabure.xyz/reset-password?token=${resetToken}`;
  
  console.log(`Password reset email for ${email}:`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log(`Username: ${username}`);
  
  // TODO: Integrate with actual email service
  // For now, we'll log the reset link
  return true;
};

export const handler: Handler = async (event, context) => {
  const headers = getSecureCorsHeaders(event.headers.origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const path = event.path.replace('/.netlify/functions/password-reset', '');

    // Request password reset
    if (event.httpMethod === 'POST' && path === '/request') {
      const { email } = body;

      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email is required' })
        };
      }

      // Find user by email
      const userResult = await sql`
        SELECT id, username, email, display_name 
        FROM users 
        WHERE email = ${email} AND is_active = true
      `;

      if (userResult.length === 0) {
        // Don't reveal if email exists for security
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'If an account with that email exists, a reset link has been sent.' 
          })
        };
      }

      const user = userResult[0];

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store reset token
      await sql`
        INSERT INTO password_reset_tokens (user_id, token, email, expires_at)
        VALUES (${user.id}, ${resetToken}, ${email}, ${expiresAt})
      `;

      // Send reset email
      await sendResetEmail(email, resetToken, user.username);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'If an account with that email exists, a reset link has been sent.' 
        })
      };
    }

    // Verify reset token
    if (event.httpMethod === 'POST' && path === '/verify') {
      const { token } = body;

      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Reset token is required' })
        };
      }

      // Check if token is valid and not expired
      const tokenResult = await sql`
        SELECT prt.*, u.username, u.email, u.display_name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = ${token} 
        AND prt.expires_at > NOW() 
        AND prt.used = false
      `;

      if (tokenResult.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid or expired reset token' })
        };
      }

      const tokenData = tokenResult[0];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          user: {
            username: tokenData.username,
            email: tokenData.email,
            display_name: tokenData.display_name
          }
        })
      };
    }

    // Reset password
    if (event.httpMethod === 'POST' && path === '/reset') {
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Token and new password are required' })
        };
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password must be at least 8 characters long' })
        };
      }

      // Check if token is valid and not expired
      const tokenResult = await sql`
        SELECT prt.*, u.id as user_id
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = ${token} 
        AND prt.expires_at > NOW() 
        AND prt.used = false
      `;

      if (tokenResult.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid or expired reset token' })
        };
      }

      const tokenData = tokenResult[0];

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await sql`
        UPDATE users 
        SET password_hash = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${tokenData.user_id}
      `;

      // Mark token as used
      await sql`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE token = ${token}
      `;

      // Clean up old tokens for this user
      await sql`
        DELETE FROM password_reset_tokens 
        WHERE user_id = ${tokenData.user_id} AND id != ${tokenData.id}
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Password has been reset successfully. You can now log in with your new password.' 
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Password reset error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
