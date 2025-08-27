'use client'

import { useState, useEffect } from 'react'
import { Activity, Filter, RefreshCw } from 'lucide-react'
import { tokenAPI } from '@/lib/api'

interface Transaction {
  id: string
  xrpl_transaction_hash: string
  type: string
  from_wallet: string
  to_wallet: string
  amount: string
  created_at: string
  metadata?: any
}

export function TransactionMonitor() {
  const [filter, setFilter] = useState('all')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await tokenAPI.getTransactions()
      setTransactions(data.transactions || [])
    } catch (err) {
      setError('Failed to fetch transactions')
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const formatAmount = (amount: string) => {
    return `${parseFloat(amount).toLocaleString()} TZS`
  }

  const formatWallet = (wallet: string) => {
    return wallet.length > 10 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet
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

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.type.toLowerCase() === filter.toLowerCase()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Monitor</h1>
          <p className="text-gray-600">Real-time XRPL transaction tracking</p>
        </div>
        <button 
          onClick={fetchTransactions}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Live Transactions</h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="mint">Mint</option>
            <option value="burn">Burn</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No transactions found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hash</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((tx, index) => (
                  <tr key={tx.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {formatWallet(tx.xrpl_transaction_hash)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        tx.type === 'mint' ? 'bg-green-100 text-green-800' :
                        tx.type === 'burn' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {formatWallet(tx.from_wallet)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {formatWallet(tx.to_wallet)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatTime(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
