import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get all deposits from pending_deposits table
    const deposits = await sql`
      SELECT 
        pd.*,
        u.username,
        u.wallet_address,
        u.email,
        u.buyer_phone
      FROM pending_deposits pd
      LEFT JOIN users u ON pd.user_id::text = u.id::text
      ORDER BY pd.created_at DESC
    `;

    // Get deposit-related transactions
    const depositTransactions = await sql`
      SELECT 
        t.*,
        u.username,
        u.wallet_address
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.type = 'deposit'
      ORDER BY t.created_at DESC
    `;

    // Get ZenoPay webhook logs from security events
    const webhookLogs = await sql`
      SELECT *
      FROM security_events
      WHERE event_type LIKE '%webhook%'
      AND details->>'source' = 'zenopay'
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        deposits: deposits.map(d => ({
          ...d,
          amount: parseFloat(d.amount || '0'),
          created_at: new Date(d.created_at).toISOString(),
          updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : null
        })),
        transactions: depositTransactions.map(t => ({
          ...t,
          amount: parseFloat(t.amount || '0'),
          created_at: new Date(t.created_at).toISOString()
        })),
        webhookLogs: webhookLogs.map(w => ({
          ...w,
          created_at: new Date(w.created_at).toISOString()
        })),
        summary: {
          totalDeposits: deposits.length,
          completedDeposits: deposits.filter(d => d.status === 'completed').length,
          pendingDeposits: deposits.filter(d => d.status === 'pending').length,
          failedDeposits: deposits.filter(d => d.status === 'failed').length,
          totalAmount: deposits
            .filter(d => d.status === 'completed')
            .reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0),
          totalTransactions: depositTransactions.length
        }
      })
    };

  } catch (error) {
    console.error('Error fetching deposits:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch deposits',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
