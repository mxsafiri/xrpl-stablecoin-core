import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// For testing purposes - in production this should come from proper authentication
const getAuthToken = () => {
  // This is a temporary solution for testing
  // In production, implement proper wallet-based authentication
  return localStorage.getItem('auth_token') || null
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token Operations
export const tokenAPI = {
  mint: async (amount: string, destinationWallet: string, reference?: string) => {
    const response = await api.post('/token/mint', {
      amount: parseFloat(amount),
      destinationWallet,
      reference,
    })
    return response.data
  },

  burn: async (amount: string, sourceWallet: string, reference?: string) => {
    const response = await api.post('/token/burn', {
      amount: parseFloat(amount),
      sourceWallet,
      reference,
    })
    return response.data
  },

  transfer: async (amount: string, sourceWallet: string, destinationWallet: string) => {
    const response = await api.post('/token/transfer', {
      amount: parseFloat(amount),
      sourceWallet,
      destinationWallet,
    })
    return response.data
  },

  getTransactions: async () => {
    const response = await api.get('/token/transactions')
    return response.data
  },

  getBalance: async (wallet: string) => {
    const response = await api.get(`/token/balance/${wallet}`)
    return response.data
  },
}

// Wallet Operations
export const walletAPI = {
  getBalance: async (address: string) => {
    const response = await api.get(`/wallets/${address}/balance`)
    return response.data
  },

  getTransactions: async (address: string) => {
    const response = await api.get(`/wallets/${address}/transactions`)
    return response.data
  },
}

// Multisig Operations
export const multisigAPI = {
  getPendingOperations: async () => {
    const response = await api.get('/token/pending-operations')
    return response.data
  },
  
  approve: async (operationId: string) => {
    const response = await api.post(`/token/approve/${operationId}`)
    return response.data
  },
  
  getCollateralBalance: async () => {
    const response = await api.get('/token/collateral')
    return response.data
  },
}

// Authentication API
export const authAPI = {
  login: async (walletAddress: string) => {
    // Simplified login for testing - just use wallet address
    const response = await api.post('/auth/login', {
      walletAddress,
      signature: 'test_signature',
      message: 'Login to TZS Dashboard'
    })
    return response.data
  },
  
  // Quick admin login for testing
  loginAsAdmin: async () => {
    try {
      const response = await api.post('/auth/login', {
        walletAddress: 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM', // Admin wallet from backend
        signature: 'test_signature',
        message: 'Admin login'
      })
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token)
        localStorage.setItem('user_role', response.data.user.role)
      }
      return response.data
    } catch (error) {
      console.error('Admin login failed:', error)
      throw error
    }
  }
}

export default api
