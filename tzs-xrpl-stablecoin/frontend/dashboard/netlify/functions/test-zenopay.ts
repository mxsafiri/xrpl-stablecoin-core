import { Handler } from '@netlify/functions';
import axios from 'axios';

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
    const { phone } = JSON.parse(event.body || '{}');
    
    if (!phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Phone number required' })
      };
    }

    // Test ZenoPay API with detailed logging
    const payload = {
      order_id: `test-${Date.now()}`,
      buyer_email: 'test@example.com',
      buyer_name: 'Test User',
      buyer_phone: phone,
      amount: 1000,
      webhook_url: 'https://nedalabs.netlify.app/.netlify/functions/zenopay-webhook'
    };

    console.log('Testing ZenoPay with payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      'https://zenoapi.com/api/payments/mobile_money_tanzania',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ZENOPAY_API_KEY
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('ZenoPay response:', JSON.stringify(response.data, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        zenopay_response: response.data,
        payload_sent: payload,
        api_key_present: !!process.env.ZENOPAY_API_KEY
      })
    };

  } catch (error: any) {
    console.error('ZenoPay test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'ZenoPay test failed',
        details: error.response?.data || error.message,
        status: error.response?.status,
        api_key_present: !!process.env.ZENOPAY_API_KEY
      })
    };
  }
}
