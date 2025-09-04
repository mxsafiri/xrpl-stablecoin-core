import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Create pending_deposits table
    await sql`
      CREATE TABLE IF NOT EXISTS pending_deposits (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        buyer_email VARCHAR(255) NOT NULL,
        buyer_name VARCHAR(255) NOT NULL,
        buyer_phone VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Add deposit_reference column to pending_operations if it doesn't exist
    await sql`
      ALTER TABLE pending_operations 
      ADD COLUMN IF NOT EXISTS deposit_reference VARCHAR(255)
    `;

    // Add indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_deposits_order_id 
      ON pending_deposits(order_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_deposits_user_id 
      ON pending_deposits(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_deposits_status 
      ON pending_deposits(status)
    `;

    // Add tx_hash column to transactions table if it doesn't exist
    await sql`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255)
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Deposit schema setup completed successfully',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('Schema setup error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Schema setup failed',
        error: error.message
      })
    };
  }
};
