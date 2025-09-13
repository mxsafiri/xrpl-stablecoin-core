import jwt from 'jsonwebtoken';

// JWT middleware for securing API endpoints
export function verifyJWT(authHeader: string | undefined): { userId: string; username: string; role: string } {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (!decoded.userId || !decoded.username || !decoded.role) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Rate limiting helper (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(identifier);

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userRequests.count >= maxRequests) {
    return false;
  }

  userRequests.count++;
  return true;
}

// Input validation helpers
export function validateAmount(amount: any): number {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  
  if (numAmount > 10000000) { // 10M TZS limit
    throw new Error('Amount exceeds maximum limit');
  }
  
  return numAmount;
}

export function validateUserId(userId: any): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID is required');
  }
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  return userId;
}

export function validateUsername(username: any): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Valid username is required');
  }
  
  // Username must end with .TZS and be reasonable length
  if (!username.endsWith('.TZS') || username.length < 5 || username.length > 50) {
    throw new Error('Username must be in format Name.TZS');
  }
  
  return username;
}
