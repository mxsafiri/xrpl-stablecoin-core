'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, RefreshCw, Activity, ExternalLink } from 'lucide-react'
import { tokenAPI } from '../../lib/api'

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
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2A9D9F] to-[#1e7a7c] text-white p-6 rounded-2xl backdrop-blur-sm border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Blockchain Activities</h1>
              <p className="text-white/90">Real-time XRPL transaction monitoring</p>
            </div>
          </div>
          <button 
            onClick={fetchTransactions}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 disabled:opacity-50 transition-colors border border-white/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Transactions Card */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#2A9D9F]" />
            Live XRPL Transactions
          </h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
          >
            <option value="all" className="bg-gray-800">All Types</option>
            <option value="mint" className="bg-gray-800">Mint</option>
            <option value="burn" className="bg-gray-800">Burn</option>
            <option value="transfer" className="bg-gray-800">Transfer</option>
          </select>
        </div>
        
        {error && (
          <div className="px-6 py-4 bg-red-500/20 border-l-4 border-red-400">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2A9D9F] mx-auto"></div>
              <p className="mt-2 text-white/70">Loading blockchain data...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-white/70">
              No transactions found
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">XRPL Hash</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredTransactions.map((tx, index) => (
                  <tr key={tx.id || index} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-[#2A9D9F]">{formatWallet(tx.xrpl_transaction_hash)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        tx.type === 'mint' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        tx.type === 'burn' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70 font-mono">
                      {formatWallet(tx.from_wallet)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70 font-mono">
                      {formatWallet(tx.to_wallet)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70">
                      {formatTime(tx.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://testnet.xrpl.org/transactions/${tx.xrpl_transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#2A9D9F] hover:text-[#2A9D9F]/80 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
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
