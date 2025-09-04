import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const sql = neon(process.env.DATABASE_URL!);

interface DepositRequest {
  user_id: string;
  amount: number;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string;
}

interface ZenoPaymentRequest {
  order_id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string;
  amount: number;
  webhook_url: string;
}

class ZenoPayService {
  private apiKey: string;
  private baseUrl: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = process.env.ZENOPAY_API_KEY || '';
    this.baseUrl = 'https://zenoapi.com/api/payments';
    this.webhookUrl = `${process.env.URL}/.netlify/functions/zenopay-webhook`;
  }

  async initiatePayment(
    amount: number,
    buyerEmail: string,
    buyerName: string,
    buyerPhone: string,
    orderId: string
  ) {
    const payload: ZenoPaymentRequest = {
      order_id: orderId,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      amount: Math.round(amount),
      webhook_url: this.webhookUrl
    };

    const response = await axios.post(
      `${this.baseUrl}/mobile_money_tanzania`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      }
    );

    return response.data;
  }

  isValidTanzanianPhone(phone: string): boolean {
    const phoneRegex = /^07\d{8}$/;
    return phoneRegex.test(phone);
  }
}

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const { user_id, amount, buyer_email, buyer_name, buyer_phone }: DepositRequest = JSON.parse(event.body || '{}');

    // Validate input
    if (!user_id || !amount || !buyer_email || !buyer_name || !buyer_phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    if (amount < 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Minimum deposit amount is 1000 TZS' })
      };
    }

    const zenoService = new ZenoPayService();

    if (!zenoService.isValidTanzanianPhone(buyer_phone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Tanzanian phone number format. Use 07XXXXXXXX' })
      };
    }

    // Generate unique order ID
    const orderId = uuidv4();

    // Create pending deposit record
    await sql`
      INSERT INTO pending_deposits (
        id, user_id, amount, order_id, buyer_email, buyer_name, buyer_phone, 
        status, created_at
      ) VALUES (
        ${uuidv4()}, ${user_id}, ${amount}, ${orderId}, ${buyer_email}, 
        ${buyer_name}, ${buyer_phone}, 'pending', NOW()
      )
    `;

    // Initiate ZenoPay payment
    const zenoResponse = await zenoService.initiatePayment(
      amount,
      buyer_email,
      buyer_name,
      buyer_phone,
      orderId
    );

    if (zenoResponse.status === 'success') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Payment initiated successfully. You will receive a mobile money prompt shortly.',
          order_id: orderId,
          amount: amount,
          zenopay_response: zenoResponse
        })
      };
    } else {
      // Update deposit status to failed
      await sql`
        UPDATE pending_deposits 
        SET status = 'failed', updated_at = NOW()
        WHERE order_id = ${orderId}
      `;

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Payment initiation failed',
          error: zenoResponse.message
        })
      };
    }

  } catch (error: any) {
    console.error('Deposit endpoint error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};
