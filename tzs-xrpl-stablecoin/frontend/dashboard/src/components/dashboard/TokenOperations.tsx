'use client'

import { useState, useEffect } from 'react'
import { Coins, Flame, ArrowRightLeft, Plus } from 'lucide-react'
import { tokenAPI, authAPI } from '../../lib/api'

interface Transaction {
  id: string
  operation_type: string
  amount: number
  destination_wallet?: string
  source_wallet?: string
  status: string
  created_at: string
}

export function TokenOperations() {
  const [activeOperation, setActiveOperation] = useState<'mint' | 'burn' | 'transfer'>('mint')
  const [formData, setFormData] = useState({
    amount: '',
    destinationWallet: '',
    sourceWallet: '',
    reference: ''
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem('auth_token')
    if (token) {
      setIsAuthenticated(true)
      fetchRecentTransactions()
    }
  }, [])

  const fetchRecentTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await tokenAPI.getTransactions()
      setRecentTransactions(data.transactions || [])
    } catch (err) {
      setError('Failed to fetch recent transactions')
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      setLoading(true)
      await authAPI.loginAsAdmin()
      setIsAuthenticated(true)
      setError(null)
      await fetchRecentTransactions()
    } catch (err) {
      setError('Failed to authenticate. Please try again.')
      console.error('Authentication error:', err)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      setError('Please login first')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const operationData = {
        amount: parseFloat(formData.amount),
        destinationWallet: formData.destinationWallet,
        sourceWallet: formData.sourceWallet,
        reference: formData.reference || undefined
      }

      let result
      switch (activeOperation) {
        case 'mint':
          result = await tokenAPI.mint(formData.amount, formData.destinationWallet, formData.reference)
          break
        case 'burn':
          result = await tokenAPI.burn(formData.amount, formData.sourceWallet, formData.reference)
          break
        case 'transfer':
          result = await tokenAPI.transfer(formData.amount, formData.sourceWallet, formData.destinationWallet)
          break
      }

      // Clear form on success
      setFormData({
        amount: '',
        destinationWallet: '',
        sourceWallet: '',
        reference: ''
      })

      // Refresh transactions
      await fetchRecentTransactions()
      
    } catch (err: any) {
      setError(err.message || `Failed to ${activeOperation} tokens`)
      console.error(`${activeOperation} error:`, err)
    } finally {
      setLoading(false)
    }
  }

  const formatWallet = (wallet?: string) => {
    return wallet && wallet.length > 10 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet || 'N/A'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Token Operations</h1>
          <p className="text-gray-600">Mint, burn, and transfer TZS tokens</p>
        </div>
        {!isAuthenticated && (
          <button
            onClick={handleLogin}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Login as Admin'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Operation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'mint', name: 'Mint Tokens', icon: Plus, color: 'text-green-600' },
              { id: 'burn', name: 'Burn Tokens', icon: Flame, color: 'text-red-600' },
              { id: 'transfer', name: 'Transfer Tokens', icon: ArrowRightLeft, color: 'text-blue-600' }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveOperation(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeOperation === tab.id
                      ? `border-blue-500 ${tab.color}`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (TZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Coins className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Conditional Fields */}
            {activeOperation === 'mint' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Wallet
                </label>
                <input
                  type="text"
                  value={formData.destinationWallet}
                  onChange={(e) => setFormData({ ...formData, destinationWallet: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  required
                />
              </div>
            )}

            {activeOperation === 'burn' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Wallet
                </label>
                <input
                  type="text"
                  value={formData.sourceWallet}
                  onChange={(e) => setFormData({ ...formData, sourceWallet: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  required
                />
              </div>
            )}

            {activeOperation === 'transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Wallet
                  </label>
                  <input
                    type="text"
                    value={formData.sourceWallet}
                    onChange={(e) => setFormData({ ...formData, sourceWallet: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Wallet
                  </label>
                  <input
                    type="text"
                    value={formData.destinationWallet}
                    onChange={(e) => setFormData({ ...formData, destinationWallet: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    required
                  />
                </div>
              </div>
            )}

            {/* Reference ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference ID (Optional)
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reference ID"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !isAuthenticated}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeOperation === 'mint' ? 'bg-green-600 hover:bg-green-700' :
                  activeOperation === 'burn' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Processing...' :
                 activeOperation === 'mint' ? 'Mint Tokens' :
                 activeOperation === 'burn' ? 'Burn Tokens' :
                 'Transfer Tokens'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Operation History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Operations</h2>
        </div>
        <div className="p-6">
          {loading && recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading recent transactions...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isAuthenticated ? 'No recent transactions found' : 'Please login to view recent transactions'}
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.slice(0, 5).map((transaction) => {
                const opType = transaction.operation_type.charAt(0).toUpperCase() + transaction.operation_type.slice(1)
                const wallet = transaction.destination_wallet || transaction.source_wallet
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.operation_type === 'mint' ? 'bg-green-100' :
                        transaction.operation_type === 'burn' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {transaction.operation_type === 'mint' ? <Plus className="w-5 h-5 text-green-600" /> :
                         transaction.operation_type === 'burn' ? <Flame className="w-5 h-5 text-red-600" /> :
                         <ArrowRightLeft className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{opType} {transaction.amount.toLocaleString()} TZS</p>
                        <p className="text-sm text-gray-500 font-mono">{formatWallet(wallet)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">{formatTime(transaction.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
