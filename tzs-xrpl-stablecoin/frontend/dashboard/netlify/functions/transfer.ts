import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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
    const { sender_id, recipient_username, amount, note } = JSON.parse(event.body || '{}');

    if (!sender_id || !recipient_username || !amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Sender ID, recipient username, and valid amount required' })
      };
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

      // Create transaction record for sender (outgoing)
      await sql`
        INSERT INTO transactions (
          id, user_id, type, amount, status, reference, created_at, description, recipient_id
        ) VALUES (
          ${require('crypto').randomUUID()}, ${sender.id}, 'transfer_out', 
          ${amount}, 'completed', ${transferId}, NOW(),
          ${`Transfer to ${recipient.username}${note ? ` - ${note}` : ''}`}, ${recipient.id}
        )
      `;

      // Create transaction record for recipient (incoming)
      await sql`
        INSERT INTO transactions (
          id, user_id, type, amount, status, reference, created_at, description, sender_id
        ) VALUES (
          ${require('crypto').randomUUID()}, ${recipient.id}, 'transfer_in', 
          ${amount}, 'completed', ${transferId}, NOW(),
          ${`Transfer from ${sender.username}${note ? ` - ${note}` : ''}`}, ${sender.id}
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

      // Commit transaction
      await sql`COMMIT`;

      console.log(`Transfer completed: ${sender.username} sent ${amount} TZS to ${recipient.username}`);

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
