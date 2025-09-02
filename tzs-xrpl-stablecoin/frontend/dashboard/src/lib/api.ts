import { databaseAPI, authenticateWallet } from './database'

// Wallet-based authentication state
let currentWallet: string | null = null
let isAuthenticated = false
let userRole: string | null = null

// Authentication helpers
const getCurrentWallet = () => {
  return localStorage.getItem('current_wallet') || null
}

const setCurrentWallet = (wallet: string, role: string) => {
  localStorage.setItem('current_wallet', wallet)
  localStorage.setItem('user_role', role)
  currentWallet = wallet
  userRole = role
  isAuthenticated = true
}

const clearAuth = () => {
  localStorage.removeItem('current_wallet')
  localStorage.removeItem('user_role')
  currentWallet = null
  userRole = null
  isAuthenticated = false
}

// Token operations via Netlify Functions
export const tokenAPI = {
  mint: async (amount: string, destinationWallet: string, reference?: string) => {
    // For demo - this would normally trigger XRPL transaction
    console.log('Mint operation:', { amount, destinationWallet, reference })
    return { success: true, txHash: 'demo_mint_' + Date.now() }
  },

  burn: async (amount: string, sourceWallet: string, reference?: string) => {
    // For demo - this would normally trigger XRPL transaction
    console.log('Burn operation:', { amount, sourceWallet, reference })
    return { success: true, txHash: 'demo_burn_' + Date.now() }
  },

  transfer: async (amount: string, sourceWallet: string, destinationWallet: string) => {
    // For demo - this would normally trigger XRPL transaction
    console.log('Transfer operation:', { amount, sourceWallet, destinationWallet })
    return { success: true, txHash: 'demo_transfer_' + Date.now() }
  },

  getTransactions: async () => {
    return await databaseAPI.getTransactions()
  },

  getBalance: async (wallet: string) => {
    const balances = await databaseAPI.getWalletBalances()
    return balances.find((b: any) => b.wallet_address === wallet)?.balance || 0
  },
}

// Wallet Operations
export const walletAPI = {
  getBalance: async (address: string) => {
    return await tokenAPI.getBalance(address)
  },

  getTransactions: async (address: string) => {
    const transactions = await databaseAPI.getTransactions()
    return transactions.filter((t: any) => t.user_wallet === address)
  },
}

// Multisig Operations
export const multisigAPI = {
  getPendingOperations: async () => {
    return await databaseAPI.getPendingOperations()
  },
  
  approve: async (operationId: string) => {
    const wallet = getCurrentWallet()
    if (!wallet) throw new Error('Not authenticated')
    return await databaseAPI.approveOperation(operationId, wallet)
  },
  
  getCollateralBalance: async () => {
    return await databaseAPI.getCollateralBalance()
  },
}

// Authentication API
export const authAPI = {
  login: async (walletAddress: string) => {
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, action: 'login' })
    })
    
    if (!response.ok) {
      throw new Error('Login failed')
    }
    
    const data = await response.json()
    setCurrentWallet(walletAddress, data.user.role)
    return {
      success: true,
      user: data.user,
      isAdmin: data.isAdmin
    }
  },

  loginAsAdmin: async () => {
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin-login' })
    })
    
    if (!response.ok) {
      throw new Error('Admin login failed')
    }
    
    const data = await response.json()
    setCurrentWallet('rfXQiN2AzW82XK6nMcU7DU1zsd4HpuQUoT', data.user.role)
    return {
      success: true,
      user: data.user,
      isAdmin: data.isAdmin
    }
  },

  logout: () => {
    clearAuth()
  },

  isAuthenticated: () => {
    return getCurrentWallet() !== null
  },

  getUserRole: () => {
    return localStorage.getItem('user_role')
  }
}
