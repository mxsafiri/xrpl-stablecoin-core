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
    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'deposit', 'withdrawal', 'transfer', 'info', 'warning', 'error'
        status VARCHAR(20) NOT NULL DEFAULT 'unread', -- 'unread', 'read'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE NULL
      )
    `;

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `;

    console.log('Notifications table created successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notifications schema created successfully'
      })
    };

  } catch (error: any) {
    console.error('Schema creation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to create notifications schema',
        error: error.message
      })
    };
  }
};
