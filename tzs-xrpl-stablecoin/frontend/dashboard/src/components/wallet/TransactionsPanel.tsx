'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface Transaction {
  id: string
  type: 'deposit' | 'send' | 'receive' | 'swap' | 'withdrawal'
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  description?: string
  recipient?: string
}

interface TransactionsPanelProps {
  onBack: () => void
}

export default function TransactionsPanel({ onBack }: TransactionsPanelProps) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'send' | 'receive' | 'swap'>('all')

  useEffect(() => {
    loadTransactions()
  }, [user])

  const loadTransactions = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getUserTransactions',
          user_id: user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.transactions) {
          const formattedTransactions = data.transactions.map((tx: any) => ({
            id: tx.id.toString(),
            type: tx.type.toLowerCase(),
            amount: parseFloat(tx.amount),
            date: new Date(tx.created_at).toLocaleDateString(),
            status: 'completed',
            description: `${tx.type} transaction`,
            recipient: tx.type === 'send' ? 'External wallet' : undefined
          }))
          setTransactions(formattedTransactions)
        }
      }
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <ArrowDownIcon className="w-6 h-6 text-[#2A9D9F]" />
      case 'send':
      case 'withdrawal':
        return <ArrowUpIcon className="w-6 h-6 text-red-400" />
      case 'receive':
        return <ArrowDownIcon className="w-6 h-6 text-[#2A9D9F]" />
      case 'swap':
        return <ArrowsRightLeftIcon className="w-6 h-6 text-blue-400" />
      default:
        return <ArrowDownIcon className="w-6 h-6 text-[#2A9D9F]" />
    }
  }

  const formatAmount = (amount: number, type: string) => {
    const isIncoming = ['deposit', 'receive'].includes(type.toLowerCase())
    const prefix = isIncoming ? '+ ' : '- '
    const color = isIncoming ? 'text-[#2A9D9F]' : 'text-red-400'
    
    return (
      <span className={color}>
        {prefix}TZS {Math.abs(amount).toFixed(2)}
      </span>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'failed':
        return 'text-red-400 bg-red-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || tx.type === filterType
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-[#2A9D9F] rounded-full blur-2xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-12 pb-24">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-3"
          >
            <ChevronRightIcon className="w-6 h-6 text-white rotate-180" />
          </button>
          <h1 className="text-[24px] font-medium text-white">Transactions</h1>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-4 py-3 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {['all', 'deposit', 'send', 'receive', 'swap'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter as any)}
                className={`px-4 py-2 rounded-[12px] text-[14px] font-medium whitespace-nowrap transition-colors ${
                  filterType === filter
                    ? 'bg-[#2A9D9F] text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-4 border border-white/[0.15] animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-white/20 rounded mb-2 w-24"></div>
                      <div className="h-3 bg-white/10 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-white/20 rounded mb-2 w-20"></div>
                    <div className="h-3 bg-white/10 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-4 border border-white/[0.15] hover:bg-white/[0.18] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="text-white text-[16px] font-medium capitalize leading-[20px]">
                        {transaction.description || transaction.type}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-white/50 text-[14px] leading-[16px]">{transaction.date}</p>
                        <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                      {transaction.recipient && (
                        <p className="text-white/40 text-[12px] mt-1">To: {transaction.recipient}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-medium leading-[20px] tabular-nums">
                      {formatAmount(transaction.amount, transaction.type)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-8 border border-white/[0.15] text-center">
              <div className="text-white/40 text-[16px] mb-2">
                {searchQuery || filterType !== 'all' ? 'No matching transactions' : 'No transactions yet'}
              </div>
              <p className="text-white/30 text-[14px]">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter'
                  : 'Your transaction history will appear here'
                }
              </p>
            </div>
          )}
        </div>

        {/* Transaction Summary */}
        {!isLoading && filteredTransactions.length > 0 && (
          <div className="mt-6 backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
            <h3 className="text-white text-[16px] font-medium mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-white/60 text-[14px]">Total Transactions</p>
                <p className="text-white text-[20px] font-medium">{filteredTransactions.length}</p>
              </div>
              <div>
                <p className="text-white/60 text-[14px]">Total Volume</p>
                <p className="text-white text-[20px] font-medium">
                  TZS {filteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
