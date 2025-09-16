import { Handler } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'
import { getSecureCorsHeaders } from './cors-config'

const sql = neon(process.env.DATABASE_URL!)

export const handler: Handler = async (event, context) => {
  const headers = getSecureCorsHeaders(event.headers.origin)
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Fix Victor.TZS balance to correct amount (5000)
    const victorUserId = '50ef6dd5-80f9-4eef-9bc2-de3451d5356c'
    const correctBalance = 5000

    // Update Victor's balance
    await sql`
      UPDATE users 
      SET balance = ${correctBalance}
      WHERE id = ${victorUserId}
    `

    // Get updated user info
    const user = await sql`
      SELECT id, wallet_address, balance, username, display_name
      FROM users 
      WHERE id = ${victorUserId}
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Victor.TZS balance corrected',
        user: user[0],
        previousBalance: 35000,
        newBalance: correctBalance
      })
    }

  } catch (error) {
    console.error('Fix Victor balance error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
