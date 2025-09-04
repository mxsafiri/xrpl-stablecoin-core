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
    console.log('Setting up withdrawal database schema...');

    // Create pending_withdrawals table
    await sql`
      CREATE TABLE IF NOT EXISTS pending_withdrawals (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        withdrawal_phone VARCHAR(20),
        destination_address VARCHAR(255),
        withdrawal_type VARCHAR(20) NOT NULL CHECK (withdrawal_type IN ('mobile_money', 'xrpl_token')),
        reference VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        transaction_id VARCHAR(255),
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add withdrawal_reference column to pending_operations if it doesn't exist
    await sql`
      ALTER TABLE pending_operations 
      ADD COLUMN IF NOT EXISTS withdrawal_reference VARCHAR(255)
    `;

    // Add indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_withdrawals_user_id ON pending_withdrawals(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_withdrawals_reference ON pending_withdrawals(reference)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_withdrawals_status ON pending_withdrawals(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_pending_withdrawals_created_at ON pending_withdrawals(created_at)
    `;

    // Update transactions table to support withdrawal types
    await sql`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS withdrawal_type VARCHAR(20)
    `;

    console.log('Withdrawal schema setup completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Withdrawal schema setup completed successfully',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Schema setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to setup withdrawal schema',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};
