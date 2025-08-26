'use client'

import { useState, useEffect } from 'react'
import { xrplService } from '@/lib/xrpl-service'

interface TokenStats {
  totalSupply: string
  circulation: string
  activeWallets: string
  transactions24h: string
}

interface Transaction {
  hash: string
  type: 'mint' | 'burn' | 'transfer'
  amount: string
  from: string
  to: string
  status: 'pending' | 'validated' | 'failed'
  timestamp: string
}

export function useRealTimeData() {
  const [stats, setStats] = useState<TokenStats>({
    totalSupply: '0',
    circulation: '0',
    activeWallets: '0',
    transactions24h: '0'
  })
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Configuration from environment
  const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'rph2KgyZXNn3fhFrDAmwmvbS5h8dQjd2ZM'
  const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'rAbc123XYZ456DEF789GHI012JKL345MNO'
  const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE || 'TZS'

  // Fetch wallet balances
  const fetchWalletBalances = async () => {
    try {
      const adminXRP = await xrplService.getXRPBalance(ADMIN_ADDRESS)
      const treasuryTZS = await xrplService.getTokenBalance(TREASURY_ADDRESS, CURRENCY_CODE, ADMIN_ADDRESS)
      
      setWalletBalances({
        [ADMIN_ADDRESS]: `${adminXRP.toFixed(2)} XRP`,
        [TREASURY_ADDRESS]: `${treasuryTZS.toFixed(0)} TZS`
      })
    } catch (error) {
      console.error('Error fetching wallet balances:', error)
    }
  }

  // Fetch recent transactions
  const fetchTransactions = async () => {
    try {
      const adminTxs = await xrplService.getAccountTransactions(ADMIN_ADDRESS, 10)
      const treasuryTxs = await xrplService.getAccountTransactions(TREASURY_ADDRESS, 10)
      
      const allTxs = [...adminTxs.result.transactions, ...treasuryTxs.result.transactions]
      
      const formattedTxs: Transaction[] = allTxs.map((tx: any) => {
        const transaction = tx.tx || tx
        const meta = tx.meta || {}
        
        return {
          hash: transaction.hash || transaction.Hash,
          type: getTransactionType(transaction),
          amount: getTransactionAmount(transaction, meta),
          from: transaction.Account,
          to: transaction.Destination || 'N/A',
          status: (meta.TransactionResult === 'tesSUCCESS' ? 'validated' : 'failed') as 'pending' | 'validated' | 'failed',
          timestamp: formatTimestamp(transaction.date)
        }
      }).slice(0, 10)
      
      setTransactions(formattedTxs)
      
      // Update 24h transaction count
      setStats(prev => ({
        ...prev,
        transactions24h: formattedTxs.length.toString()
      }))
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  // Calculate token statistics
  const calculateStats = async () => {
    try {
      // This would typically come from your backend API
      // For now, we'll estimate based on available data
      const treasuryBalance = await xrplService.getTokenBalance(TREASURY_ADDRESS, CURRENCY_CODE, ADMIN_ADDRESS)
      
      setStats(prev => ({
        ...prev,
        totalSupply: '1250000', // This should come from your backend
        circulation: Math.max(0, 1250000 - treasuryBalance).toString(),
        activeWallets: '1247' // This should come from your backend
      }))
    } catch (error) {
      console.error('Error calculating stats:', error)
    }
  }

  // Set up real-time transaction monitoring
  useEffect(() => {
    const setupRealTimeMonitoring = async () => {
      try {
        // Subscribe to real-time transactions
        xrplService.subscribeToTransactions([ADMIN_ADDRESS, TREASURY_ADDRESS], (transaction) => {
          const newTx: Transaction = {
            hash: transaction.transaction.hash,
            type: getTransactionType(transaction.transaction),
            amount: getTransactionAmount(transaction.transaction, transaction.meta),
            from: transaction.transaction.Account,
            to: transaction.transaction.Destination || 'N/A',
            status: transaction.meta.TransactionResult === 'tesSUCCESS' ? 'validated' : 'failed',
            timestamp: 'Just now'
          }
          
          setTransactions(prev => [newTx, ...prev.slice(0, 9)])
        })
      } catch (error) {
        console.error('Error setting up real-time monitoring:', error)
      }
    }

    setupRealTimeMonitoring()

    return () => {
      xrplService.unsubscribeFromTransactions()
    }
  }, [ADMIN_ADDRESS, TREASURY_ADDRESS])

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchWalletBalances(),
        fetchTransactions(),
        calculateStats()
      ])
      setIsLoading(false)
    }

    fetchInitialData()

    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchWalletBalances()
      fetchTransactions()
      calculateStats()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    stats,
    transactions,
    walletBalances,
    isLoading,
    refreshData: () => {
      fetchWalletBalances()
      fetchTransactions()
      calculateStats()
    }
  }
}

// Helper functions
function getTransactionType(transaction: any): 'mint' | 'burn' | 'transfer' {
  if (transaction.TransactionType === 'TrustSet') return 'mint'
  if (transaction.TransactionType === 'Payment') return 'transfer'
  return 'transfer'
}

function getTransactionAmount(transaction: any, meta: any): string {
  if (transaction.Amount) {
    if (typeof transaction.Amount === 'string') {
      return `${(parseInt(transaction.Amount) / 1000000).toFixed(2)} XRP`
    } else {
      return `${transaction.Amount.value} ${transaction.Amount.currency}`
    }
  }
  return '0'
}

function formatTimestamp(rippleTime?: number): string {
  if (!rippleTime) return 'Unknown'
  
  // Convert Ripple timestamp to Unix timestamp
  const unixTime = (rippleTime + 946684800) * 1000
  const date = new Date(unixTime)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`
  return date.toLocaleDateString()
}
