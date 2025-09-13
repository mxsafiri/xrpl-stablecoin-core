import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id } = body;

    // Check what tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    // Check users table
    const users = await sql`SELECT id, username, email FROM users LIMIT 5`;

    // Check transactions table
    const transactions = await sql`SELECT * FROM transactions LIMIT 10`;

    // Check deposits table (might not exist)
    let deposits = [];
    try {
      deposits = await sql`SELECT * FROM deposits LIMIT 10`;
    } catch (e: any) {
      deposits = [`Error: ${e.message}`];
    }

    // Check pending_deposits table
    let pendingDeposits = [];
    try {
      pendingDeposits = await sql`SELECT * FROM pending_deposits LIMIT 10`;
    } catch (e: any) {
      pendingDeposits = [`Error: ${e.message}`];
    }

    // Check specific user data if provided
    let userSpecific = null;
    if (user_id) {
      const userTransactions = await sql`
        SELECT * FROM transactions WHERE user_id = ${user_id}
      `;
      let userDeposits = [];
      try {
        userDeposits = await sql`
          SELECT * FROM deposits WHERE user_id = ${user_id}
        `;
      } catch (e: any) {
        userDeposits = [`Error: ${e.message}`];
      }
      let userPendingDeposits = [];
      try {
        userPendingDeposits = await sql`
          SELECT * FROM pending_deposits WHERE user_id = ${user_id}
        `;
      } catch (e: any) {
        userPendingDeposits = [`Error: ${e.message}`];
      }
      userSpecific = { userTransactions, userDeposits, userPendingDeposits };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tables: tables.map(t => t.table_name),
        users,
        transactions,
        deposits,
        pendingDeposits,
        userSpecific
      })
    };

  } catch (error: any) {
    console.error('Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
