import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Add missing deposit transactions for Victor's completed deposits
    const deposits = [
      {
        reference: '0975954345',
        amount: 1000,
        date: '2025-09-05T08:44:58.024Z',
        wallet: 'rBih9a7DirrgPq5uJm8ajrhv2kctveftZH'
      },
      {
        reference: '0975642534', 
        amount: 1000,
        date: '2025-09-04T13:00:20.088Z',
        wallet: 'rBih9a7DirrgPq5uJm8ajrhv2kctveftZH'
      }
    ]

    const results = []
    
    for (const deposit of deposits) {
      // Check if transaction already exists
      const existing = await sql`
        SELECT id FROM transactions 
        WHERE xrpl_transaction_hash = ${'deposit_' + deposit.reference}
      `
      
      if (existing.length === 0) {
        // Add the deposit transaction
        const result = await sql`
          INSERT INTO transactions (
            xrpl_transaction_hash, type, from_wallet, to_wallet, 
            amount, metadata, created_at, updated_at
          ) VALUES (
            ${'deposit_' + deposit.reference}, 
            'mint', 
            'zenopay', 
            ${deposit.wallet}, 
            ${deposit.amount}, 
            ${JSON.stringify({ reference: deposit.reference, source: 'zenopay' })},
            ${deposit.date},
            ${deposit.date}
          )
          RETURNING id, type, amount, created_at
        `
        results.push(result[0])
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        added_transactions: results.length,
        transactions: results
      })
    }

  } catch (error) {
    console.error('Add deposit transactions error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
