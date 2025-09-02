// API client for Netlify Functions
const API_BASE = '/.netlify/functions'

// Wallet-based authentication via API
export const authenticateWallet = async (walletAddress: string): Promise<{ user: any, isAdmin: boolean }> => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress })
  })
  
  if (!response.ok) {
    throw new Error('Wallet not authorized')
  }
  
  return await response.json()
}

// Database operations via Netlify Functions
export const databaseAPI = {
  // Register new user
  registerUser: async (walletAddress: string, role: string = 'user') => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, role })
    })
    
    if (!response.ok) {
      throw new Error('Registration failed')
    }
    
    return await response.json()
  },

  // Get multisig operations
  getPendingOperations: async () => {
    const response = await fetch(`${API_BASE}/database/pending-operations`)
    return await response.json()
  },

  // Get transactions
  getTransactions: async () => {
    const response = await fetch(`${API_BASE}/database/transactions`)
    return await response.json()
  },

  // Get wallet balances
  getWalletBalances: async () => {
    const response = await fetch(`${API_BASE}/database/wallet-balances`)
    return await response.json()
  },

  // Get collateral balance
  getCollateralBalance: async () => {
    const response = await fetch(`${API_BASE}/database/collateral-balance`)
    const data = await response.json()
    return data.total
  },

  // Approve multisig operation (admin only)
  approveOperation: async (operationId: string, userWallet: string) => {
    const response = await fetch(`${API_BASE}/database/approve/${operationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userWallet })
    })
    
    if (!response.ok) {
      throw new Error('Approval failed')
    }
    
    return await response.json()
  }
}
