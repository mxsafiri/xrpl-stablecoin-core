import crypto from 'crypto';

// HMAC signature verification for ZenoPay webhooks
export function verifyZenoPayWebhook(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    throw new Error('ZENOPAY_WEBHOOK_SECRET environment variable is required');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Generate secure webhook secret (for setup)
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate webhook payload structure
export function validateZenoPayload(payload: any): boolean {
  const requiredFields = ['order_id', 'payment_status', 'reference'];
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      return false;
    }
  }

  // Validate payment status is from expected values
  const validStatuses = ['COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED', 'PENDING'];
  if (!validStatuses.includes(payload.payment_status)) {
    return false;
  }

  return true;
}

// Security logging for webhook events
export function logSecurityEvent(event: string, details: any, level: 'info' | 'warning' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    level,
    details: typeof details === 'object' ? JSON.stringify(details) : details
  };

  console.log(`[SECURITY-${level.toUpperCase()}] ${timestamp}: ${event}`, logEntry);
  
  // In production, send to security monitoring service
  // await sendToSecurityMonitoring(logEntry);
}
