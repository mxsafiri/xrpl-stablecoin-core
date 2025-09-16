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
    // Remove the specific stale operations from testing phase
    const result = await sql`
      DELETE FROM pending_operations 
      WHERE id IN (1, 2, 3) 
      AND status = 'pending' 
      AND operation_type = 'mint'
      AND amount = '43000.00000000'
      AND created_at < '2025-09-10'
    `;

    console.log('Cleaned up stale multisig operations:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Stale multisig operations cleaned up',
        deletedCount: result.count || 0
      })
    };

  } catch (error) {
    console.error('Error cleaning stale operations:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to clean stale operations',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
