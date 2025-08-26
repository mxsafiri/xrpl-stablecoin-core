import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token Operations
export const tokenAPI = {
  mint: async (amount: string, destinationWallet: string, reference?: string) => {
    const response = await api.post('/psp/mint', {
      amount: parseFloat(amount),
      destinationWallet,
      reference,
    })
    return response.data
  },

  burn: async (amount: string, sourceWallet: string, reference?: string) => {
    const response = await api.post('/psp/burn', {
      amount: parseFloat(amount),
      sourceWallet,
      reference,
    })
    return response.data
  },

  transfer: async (amount: string, sourceWallet: string, destinationWallet: string) => {
    const response = await api.post('/tokens/transfer', {
      amount: parseFloat(amount),
      sourceWallet,
      destinationWallet,
    })
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
    const response = await api.get('/multisig/pending')
    return response.data
  },

  approveOperation: async (operationId: string) => {
    const response = await api.post(`/multisig/${operationId}/approve`)
    return response.data
  },

  rejectOperation: async (operationId: string) => {
    const response = await api.post(`/multisig/${operationId}/reject`)
    return response.data
  },
}

export default api
