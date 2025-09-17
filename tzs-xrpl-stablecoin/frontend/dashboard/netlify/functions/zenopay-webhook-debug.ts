import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, X-API-Key, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Log everything for debugging
    const debugInfo = {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body,
      timestamp: new Date().toISOString(),
      queryParams: event.queryStringParameters
    };

    console.log('ZenoPay Webhook Debug:', JSON.stringify(debugInfo, null, 2));

    // Store debug info in database for review
    try {
      await sql`
        INSERT INTO audit_logs (
          id, action, details, created_at
        ) VALUES (
          ${crypto.randomUUID()}, 'webhook_debug',
          ${JSON.stringify(debugInfo)}, NOW()
        )
      `;
    } catch (auditError) {
      console.log('Audit log failed, continuing without logging:', auditError);
    }

    if (event.httpMethod === 'POST' && event.body) {
      try {
        const payload = JSON.parse(event.body);
        console.log('Parsed webhook payload:', payload);

        // Try to find the pending deposit by order_id
        if (payload.order_id) {
          const depositResult = await sql`
            SELECT pd.*, u.id as user_id, u.balance
            FROM pending_deposits pd
            JOIN users u ON pd.user_id = u.id
            WHERE pd.order_id = ${payload.order_id}
          `;

          console.log('Found deposits:', depositResult);

          if (depositResult.length > 0 && payload.payment_status === 'COMPLETED') {
            const deposit = depositResult[0];
            
            // Update user balance
            await sql`
              UPDATE users 
              SET balance = balance + ${deposit.amount}
              WHERE id = ${deposit.user_id}
            `;

            // Mark deposit as completed
            await sql`
              UPDATE pending_deposits 
              SET status = 'completed', reference = ${payload.reference || null}
              WHERE order_id = ${payload.order_id}
            `;

            // Log transaction
            await sql`
              INSERT INTO transactions (
                id, user_id, type, amount, status, reference, 
                metadata, created_at
              ) VALUES (
                ${crypto.randomUUID()}, ${deposit.user_id}, 'deposit', ${deposit.amount}, 
                'completed', ${payload.reference || deposit.order_id}, 
                ${JSON.stringify(payload)}, NOW()
              )
            `;

            console.log(`✅ Balance updated for user ${deposit.user_id}: +${deposit.amount} TZS`);
          }
        }
      } catch (parseError) {
        console.error('Error parsing webhook payload:', parseError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook received and logged',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Webhook debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
