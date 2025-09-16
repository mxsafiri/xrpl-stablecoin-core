// Centralized CORS configuration for security
export const ALLOWED_ORIGINS = [
  'https://www.tumabure.xyz',
  'https://tumabure.xyz',
  'https://nedalabs.netlify.app', // Legacy domain
  'https://68c3e945a7d32fdfe4ec7112--nedalabs.netlify.app', // Deploy preview URLs
  'http://localhost:3000', // Development only
  'http://localhost:3001'  // Development only
];

export function getSecureCorsHeaders(origin?: string): Record<string, string> {
  // Check if origin is allowed
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
}

// Generic error responses to prevent information disclosure
export const GENERIC_ERRORS = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  BAD_REQUEST: 'Invalid request',
  NOT_FOUND: 'Resource not found',
  RATE_LIMITED: 'Too many requests',
  SERVER_ERROR: 'Internal server error'
};

// Security logging helper
export function createSecurityLog(event: string, details: any, level: 'info' | 'warning' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = typeof details === 'object' ? 
    JSON.stringify(details).substring(0, 500) : // Limit log size
    String(details).substring(0, 500);

  return {
    timestamp,
    event,
    level,
    details: sanitizedDetails,
    source: 'tzs-platform'
  };
}
