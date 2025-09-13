// Transaction velocity and limits system for security
interface VelocityCheck {
  userId: string;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal';
  timestamp: number;
}

// In-memory store (in production, use Redis or database)
const velocityStore = new Map<string, VelocityCheck[]>();

// Daily limits (in TZS)
const DAILY_LIMITS = {
  transfer: 100000,    // 100K TZS per day
  deposit: 500000,     // 500K TZS per day  
  withdrawal: 200000   // 200K TZS per day
};

// Hourly limits (in TZS)
const HOURLY_LIMITS = {
  transfer: 50000,     // 50K TZS per hour
  deposit: 100000,     // 100K TZS per hour
  withdrawal: 50000    // 50K TZS per hour
};

// Maximum single transaction amounts
const MAX_SINGLE_TRANSACTION = {
  transfer: 50000,     // 50K TZS per transaction
  deposit: 100000,     // 100K TZS per transaction
  withdrawal: 100000   // 100K TZS per transaction
};

export function checkVelocityLimits(
  userId: string, 
  amount: number, 
  type: 'transfer' | 'deposit' | 'withdrawal'
): { allowed: boolean; reason?: string } {
  
  // Check single transaction limit
  if (amount > MAX_SINGLE_TRANSACTION[type]) {
    return {
      allowed: false,
      reason: `Single transaction limit exceeded. Maximum: ${MAX_SINGLE_TRANSACTION[type].toLocaleString()} TZS`
    };
  }

  const now = Date.now();
  const userTransactions = velocityStore.get(userId) || [];
  
  // Clean old transactions (older than 24 hours)
  const recentTransactions = userTransactions.filter(tx => 
    now - tx.timestamp < 24 * 60 * 60 * 1000
  );
  
  // Calculate daily total
  const dailyTotal = recentTransactions
    .filter(tx => tx.type === type)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  if (dailyTotal + amount > DAILY_LIMITS[type]) {
    return {
      allowed: false,
      reason: `Daily limit exceeded. Limit: ${DAILY_LIMITS[type].toLocaleString()} TZS, Used: ${dailyTotal.toLocaleString()} TZS`
    };
  }
  
  // Calculate hourly total
  const oneHourAgo = now - (60 * 60 * 1000);
  const hourlyTotal = recentTransactions
    .filter(tx => tx.type === type && tx.timestamp > oneHourAgo)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  if (hourlyTotal + amount > HOURLY_LIMITS[type]) {
    return {
      allowed: false,
      reason: `Hourly limit exceeded. Limit: ${HOURLY_LIMITS[type].toLocaleString()} TZS, Used: ${hourlyTotal.toLocaleString()} TZS`
    };
  }
  
  return { allowed: true };
}

export function recordTransaction(
  userId: string,
  amount: number,
  type: 'transfer' | 'deposit' | 'withdrawal'
): void {
  const userTransactions = velocityStore.get(userId) || [];
  
  userTransactions.push({
    userId,
    amount,
    type,
    timestamp: Date.now()
  });
  
  // Keep only last 100 transactions per user to prevent memory bloat
  if (userTransactions.length > 100) {
    userTransactions.splice(0, userTransactions.length - 100);
  }
  
  velocityStore.set(userId, userTransactions);
}

// Fraud detection patterns
export function detectSuspiciousActivity(
  userId: string,
  amount: number,
  type: 'transfer' | 'deposit' | 'withdrawal'
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const userTransactions = velocityStore.get(userId) || [];
  const now = Date.now();
  
  // Check for rapid-fire transactions (more than 5 in 5 minutes)
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  const recentCount = userTransactions.filter(tx => 
    tx.timestamp > fiveMinutesAgo
  ).length;
  
  if (recentCount >= 5) {
    reasons.push('Rapid transaction pattern detected');
  }
  
  // Check for round number patterns (potential automation)
  if (amount % 1000 === 0 && amount >= 10000) {
    const roundAmountCount = userTransactions.filter(tx =>
      tx.amount % 1000 === 0 && tx.amount >= 10000 &&
      tx.timestamp > now - (24 * 60 * 60 * 1000)
    ).length;
    
    if (roundAmountCount >= 3) {
      reasons.push('Suspicious round amount pattern');
    }
  }
  
  // Check for unusual time patterns (transactions at odd hours)
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5) { // 2 AM to 5 AM
    const nightTransactions = userTransactions.filter(tx => {
      const txHour = new Date(tx.timestamp).getHours();
      return txHour >= 2 && txHour <= 5 &&
             tx.timestamp > now - (7 * 24 * 60 * 60 * 1000); // Last 7 days
    }).length;
    
    if (nightTransactions >= 3) {
      reasons.push('Unusual transaction timing pattern');
    }
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons
  };
}
