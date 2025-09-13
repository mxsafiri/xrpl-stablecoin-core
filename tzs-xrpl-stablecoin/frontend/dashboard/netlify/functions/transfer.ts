import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyJWT, checkRateLimit, validateAmount, validateUserId, validateUsername } from './jwt-middleware';
import { getSecureCorsHeaders, GENERIC_ERRORS, createSecurityLog } from './cors-config';
import { checkVelocityLimits, recordTransaction, detectSuspiciousActivity } from './velocity-limits';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = getSecureCorsHeaders(event.headers.origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // JWT Authentication - CRITICAL SECURITY FIX
    let authenticatedUser;
    try {
      authenticatedUser = verifyJWT(event.headers.authorization || event.headers.Authorization);
    } catch (error: any) {
      console.log(createSecurityLog('transfer_auth_failed', { error: error.message }, 'warning'));
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: GENERIC_ERRORS.UNAUTHORIZED })
      };
    }

    // Rate limiting - prevent abuse
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!checkRateLimit(`transfer_${authenticatedUser.userId}_${clientIP}`, 5, 60000)) { // 5 transfers per minute
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: GENERIC_ERRORS.RATE_LIMITED })
      };
    }

    const { sender_id, recipient_username, amount, note } = JSON.parse(event.body || '{}');

    // Input validation with security checks
    try {
      validateUserId(sender_id);
      validateUsername(recipient_username);
      validateAmount(amount);
    } catch (error: any) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Validation error: ' + error.message })
      };
    }

    // Ensure authenticated user matches sender
    if (authenticatedUser.userId !== sender_id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: GENERIC_ERRORS.FORBIDDEN })
      };
    }

    // Check velocity limits and fraud detection
    const velocityCheck = checkVelocityLimits(authenticatedUser.userId, amount, 'transfer');
    if (!velocityCheck.allowed) {
      console.log(createSecurityLog('transfer_velocity_limit', {
        userId: authenticatedUser.userId,
        amount,
        reason: velocityCheck.reason
      }, 'warning'));
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: velocityCheck.reason })
      };
    }

    // Fraud detection
    const fraudCheck = detectSuspiciousActivity(authenticatedUser.userId, amount, 'transfer');
    if (fraudCheck.suspicious) {
      console.log(createSecurityLog('transfer_suspicious_activity', {
        userId: authenticatedUser.userId,
        amount,
        reasons: fraudCheck.reasons
      }, 'error'));
      // Still allow but log for review
    }

    // Start transaction
    await sql`BEGIN`;

    try {
      // Get sender details and balance
      const senderResult = await sql`
        SELECT id, username, balance, wallet_address 
        FROM users 
        WHERE id = ${sender_id}
      `;

      if (senderResult.length === 0) {
        throw new Error('Sender not found');
      }

      const sender = senderResult[0];
      const senderBalance = parseFloat(sender.balance || '0');

      if (senderBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Get recipient details
      const recipientResult = await sql`
        SELECT id, username, wallet_address 
        FROM users 
        WHERE username = ${recipient_username}
      `;

      if (recipientResult.length === 0) {
        throw new Error('Recipient not found');
      }

      const recipient = recipientResult[0];

      if (sender.id === recipient.id) {
        throw new Error('Cannot send to yourself');
      }

      // Update sender balance
      await sql`
        UPDATE users 
        SET balance = balance - ${amount}, updated_at = NOW()
        WHERE id = ${sender.id}
      `;

      // Update recipient balance
      await sql`
        UPDATE users 
        SET balance = balance + ${amount}, updated_at = NOW()
        WHERE id = ${recipient.id}
      `;

      const transferId = require('crypto').randomUUID();

      // Create transaction record for sender (outgoing) - use existing schema
      const senderTxId = require('crypto').randomUUID();
      await sql`
        INSERT INTO transactions (
          id, xrpl_transaction_hash, type, amount, from_wallet, to_wallet, metadata, created_at, updated_at
        ) VALUES (
          ${senderTxId}, ${`transfer_out_${senderTxId}`}, 'mint', 
          ${amount}, ${sender.id}, ${recipient.id}, 
          ${JSON.stringify({
            type: 'transfer_out',
            sender_username: sender.username,
            recipient_username: recipient.username,
            note: note || null,
            reference: transferId
          })},
          NOW(), NOW()
        )
      `;

      // Create transaction record for recipient (incoming) - use existing schema
      const recipientTxId = require('crypto').randomUUID();
      await sql`
        INSERT INTO transactions (
          id, xrpl_transaction_hash, type, amount, from_wallet, to_wallet, metadata, created_at, updated_at
        ) VALUES (
          ${recipientTxId}, ${`transfer_in_${recipientTxId}`}, 'mint', 
          ${amount}, ${sender.id}, ${recipient.id}, 
          ${JSON.stringify({
            type: 'transfer_in',
            sender_username: sender.username,
            recipient_username: recipient.username,
            note: note || null,
            reference: transferId
          })},
          NOW(), NOW()
        )
      `;

      // Create notification for recipient
      await sql`
        INSERT INTO notifications (
          id, user_id, type, title, message, status, created_at
        ) VALUES (
          ${require('crypto').randomUUID()}, ${recipient.id}, 'transfer_received', 
          'Money Received', 
          ${`You received TZS ${amount.toLocaleString()} from ${sender.username}${note ? ` - ${note}` : ''}`},
          'unread', NOW()
        )
      `;

      // Create notification for sender
      await sql`
        INSERT INTO notifications (
          id, user_id, type, title, message, status, created_at
        ) VALUES (
          ${require('crypto').randomUUID()}, ${sender.id}, 'transfer_sent', 
          'Money Sent', 
          ${`You sent TZS ${amount.toLocaleString()} to ${recipient.username}${note ? ` - ${note}` : ''}`},
          'unread', NOW()
        )
      `;

      // Record transaction for velocity tracking
      recordTransaction(authenticatedUser.userId, amount, 'transfer');

      // Commit transaction
      await sql`COMMIT`;

      console.log(createSecurityLog('transfer_completed', {
        senderId: sender.id,
        recipientId: recipient.id,
        amount,
        transferId
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Transfer completed successfully',
          transfer: {
            id: transferId,
            sender: sender.username,
            recipient: recipient.username,
            amount: amount,
            note: note || null,
            timestamp: new Date().toISOString()
          }
        })
      };

    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error: any) {
    console.error('Transfer error:', error);
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Transfer failed'
      })
    };
  }
};
