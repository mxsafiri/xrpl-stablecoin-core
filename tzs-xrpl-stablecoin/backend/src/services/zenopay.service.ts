import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface ZenoPaymentRequest {
  order_id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string;
  amount: number;
  webhook_url?: string;
}

export interface ZenoPaymentResponse {
  status: string;
  resultcode: string;
  message: string;
  order_id: string;
}

export interface ZenoOrderStatus {
  reference: string;
  resultcode: string;
  result: string;
  message: string;
  data: Array<{
    order_id: string;
    creation_date: string;
    amount: string;
    payment_status: string;
    transid: string;
    channel: string;
    reference: string;
    msisdn: string;
  }>;
}

export interface ZenoWebhookPayload {
  order_id: string;
  payment_status: string;
  reference: string;
  metadata?: any;
}

class ZenoPayService {
  private apiKey: string;
  private baseUrl: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = process.env.ZENOPAY_API_KEY || '';
    this.baseUrl = 'https://zenoapi.com/api/payments';
    this.webhookUrl = process.env.ZENOPAY_WEBHOOK_URL || '';
    
    if (!this.apiKey) {
      throw new Error('ZENOPAY_API_KEY environment variable is required');
    }
  }

  /**
   * Initiate a mobile money payment
   */
  async initiatePayment(
    amount: number,
    buyerEmail: string,
    buyerName: string,
    buyerPhone: string,
    customOrderId?: string
  ): Promise<ZenoPaymentResponse> {
    const orderId = customOrderId || uuidv4();
    
    // Validate phone number format (Tanzanian mobile)
    if (!this.isValidTanzanianPhone(buyerPhone)) {
      throw new Error('Invalid Tanzanian phone number format. Use 07XXXXXXXX');
    }

    const payload: ZenoPaymentRequest = {
      order_id: orderId,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      amount: Math.round(amount), // Ensure integer amount
      webhook_url: this.webhookUrl
    };

    try {
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
    } catch (error: any) {
      console.error('ZenoPay payment initiation failed:', error.response?.data || error.message);
      throw new Error(`Payment initiation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkOrderStatus(orderId: string): Promise<ZenoOrderStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/order-status`,
        {
          params: { order_id: orderId },
          headers: {
            'x-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('ZenoPay status check failed:', error.response?.data || error.message);
      throw new Error(`Status check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify webhook authenticity
   */
  verifyWebhook(apiKey: string): boolean {
    return apiKey === this.apiKey;
  }

  /**
   * Calculate stablecoin amount from TZS
   * Assuming 1:1 peg for now, but this could include fees/exchange rates
   */
  calculateStablecoinAmount(tzsAmount: number): number {
    // For now, 1 TZS = 1 TZS Stablecoin
    // You could add fees here: e.g., tzsAmount * 0.99 (1% fee)
    return tzsAmount;
  }

  /**
   * Validate Tanzanian phone number format
   */
  private isValidTanzanianPhone(phone: string): boolean {
    // Tanzanian mobile numbers: 07XXXXXXXX (10 digits starting with 07)
    const phoneRegex = /^07\d{8}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number for international use
   */
  formatPhoneNumber(phone: string): string {
    // Convert 07XXXXXXXX to +25574XXXXXXXX
    if (phone.startsWith('07')) {
      return `+255${phone.substring(1)}`;
    }
    return phone;
  }
}

export default new ZenoPayService();
