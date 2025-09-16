'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  ArrowsRightLeftIcon,
  HomeIcon,
  CreditCardIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  RectangleStackIcon
} from '@heroicons/react/24/outline'
import DepositModal from './DepositModal'
import SendModal from './SendModal'
import SettingsPanel from './SettingsPanel'
import TransactionsPanel from './TransactionsPanel'
import WalletsPanel from './WalletsPanel'
import AppsPanel from './AppsPanel'

interface Transaction {
  id: string
  type: 'deposit' | 'send' | 'receive' | 'swap'
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
}

interface WalletStats {
  totalBalance: number
  pendingDeposits: number
  totalTransactions: number
  monthlySpending: number
}

export default function ModernWalletDashboard() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalBalance: 0,
    pendingDeposits: 0,
    totalTransactions: 0,
    monthlySpending: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    if (user) {
      loadWalletData()
    }
  }, [user])

  const loadWalletData = async () => {
    setIsLoading(true)
    try {
      // Get fresh balance from database
      let currentBalance = 0
      if (user?.id) {
        try {
          const token = localStorage.getItem('auth_token')
          const balanceResponse = await fetch('/.netlify/functions/database', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'getBalance',
              user_id: user.id
            })
          })
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            currentBalance = parseFloat(balanceData.balance || '0')
          }
        } catch (error) {
          console.log('Could not fetch fresh balance:', error)
        }
      }

      setWalletStats({
        totalBalance: currentBalance,
        pendingDeposits: 0,
        totalTransactions: 0,
        monthlySpending: 0
      })

      // Load transactions
      try {
        const token = localStorage.getItem('auth_token')
        const transactionResponse = await fetch('/.netlify/functions/database', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'getUserTransactions',
            user_id: user?.id
          })
        })

        if (transactionResponse.ok) {
          const data = await transactionResponse.json()
          const formattedTransactions = (data.transactions || []).map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount),
            date: new Date(tx.date).toLocaleDateString(),
            status: tx.status || 'completed'
          }))
          setTransactions(formattedTransactions)
        }
      } catch (error) {
        console.log('Could not fetch transactions:', error)
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error)
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
        return <ArrowUpIcon className="w-6 h-6 text-white" />
      case 'swap':
        return <ArrowsRightLeftIcon className="w-6 h-6 text-white" />
      default:
        return <ArrowDownIcon className="w-6 h-6 text-[#2A9D9F]" />
    }
  }

  const formatAmount = (amount: number, type: string) => {
    const prefix = type.toLowerCase() === 'deposit' ? '+ ' : '- '
    return (
      <span className="text-white">
        {prefix}TZS {Math.abs(amount).toFixed(2)}
      </span>
    )
  }

  const handleDeposit = async (amount: number, phone: string) => {
    try {
      // Initiate ZenoPay mobile money deposit
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/.netlify/functions/deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user?.id,
          amount: amount,
          buyer_email: user?.email || `${user?.username}@tzs.com`,
          buyer_name: user?.display_name || user?.username || 'TZS User',
          buyer_phone: phone
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Deposit initiated successfully:', data)
        // Don't close modal immediately - let user see success message
        // Modal will close after showing success state
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Deposit failed')
      }
    } catch (error) {
      console.error('Deposit error:', error)
      throw error
    }
  }

  const handleSend = async (recipient: string, amount: number, note?: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/.netlify/functions/transfer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sender_id: user?.id,
          recipient_username: recipient,
          amount: amount,
          note: note
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Transfer completed successfully:', data)
        // Reload wallet data to reflect new balance
        await loadWalletData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transfer failed')
      }
    } catch (error) {
      console.error('Transfer error:', error)
      throw error
    }
  }

  const SkeletonLoader = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-white/20 rounded mb-2"></div>
      <div className="h-3 bg-white/10 rounded w-3/4"></div>
    </div>
  )

  // Show different panels based on active tab
  if (activeTab === 'settings') {
    return <SettingsPanel onBack={() => setActiveTab('home')} />
  }
  
  if (activeTab === 'transactions') {
    return <TransactionsPanel onBack={() => setActiveTab('home')} />
  }
  
  if (activeTab === 'wallets') {
    return <WalletsPanel onBack={() => setActiveTab('home')} />
  }
  
  if (activeTab === 'apps') {
    return <AppsPanel onBack={() => setActiveTab('home')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-[#2A9D9F] rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#2A9D9F] rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 pt-12 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-medium text-white leading-[32px] mb-2 tracking-tight">
            Welcome back,<br />{user?.display_name || user?.username || 'Victor'} 👋
          </h1>
          <p className="text-white/50 text-[14px] leading-[18px] font-light">
Tuma bure - send money free and easy.
          </p>
        </div>

        {/* Balance Card */}
        <div className="backdrop-blur-2xl bg-white/[0.15] rounded-[32px] p-8 mb-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/[0.18] mx-2">
          <div className="text-center mb-8">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-12 bg-white/20 rounded mb-2 w-48 mx-auto"></div>
              </div>
            ) : (
              <div className="text-[42px] font-medium text-[#2A9D9F] leading-[46px] tracking-tight">
                TZS {walletStats.totalBalance.toFixed(2)}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => {
                console.log('Deposit button clicked, opening modal...');
                setIsDepositModalOpen(true);
              }}
              className="backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[16px] px-4 py-3 transition-all duration-200 border border-white/[0.15] shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] flex items-center justify-center space-x-2"
            >
              <ArrowDownIcon className="w-4 h-4 text-white" />
              <span className="text-white text-[13px] font-medium">Deposit</span>
            </button>
            <button 
              onClick={() => setIsSendModalOpen(true)}
              className="backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[16px] px-4 py-3 transition-all duration-200 border border-white/[0.15] shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] flex items-center justify-center space-x-2"
            >
              <ArrowUpIcon className="w-4 h-4 text-white" />
              <span className="text-white text-[13px] font-medium">Send</span>
            </button>
            <button className="backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[16px] px-4 py-3 transition-all duration-200 border border-white/[0.15] shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] flex items-center justify-center space-x-2">
              <ArrowsRightLeftIcon className="w-4 h-4 text-white" />
              <span className="text-white text-[13px] font-medium">Swap</span>
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <h2 className="text-[18px] font-medium text-white mb-4 leading-[22px] tracking-tight">Recent Transactions</h2>
          
          <div className="space-y-0">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="py-4 border-b border-white/[0.08] last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-6 h-6 bg-white/20 rounded animate-pulse"></div>
                      <SkeletonLoader />
                    </div>
                    <SkeletonLoader />
                  </div>
                </div>
              ))
            ) : transactions.length > 0 ? (
              transactions.slice(0, 2).map((transaction, index) => (
                <div key={transaction.id} className="py-5 border-b border-white/[0.08] last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="text-white text-[15px] font-medium capitalize leading-[18px]">{transaction.type}</p>
                        <p className="text-white/50 text-[12px] leading-[16px] mt-0.5 font-light">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-[15px] font-medium leading-[18px] tabular-nums">
                        {formatAmount(transaction.amount, transaction.type)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <div className="text-white/40 text-[14px]">
                  No transactions yet
                </div>
                <p className="text-white/30 text-[12px] mt-2">
                  Your transaction history will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="backdrop-blur-2xl bg-white/[0.15] border-t border-white/[0.15] px-6 py-6 shadow-[0_-8px_32px_0_rgba(31,38,135,0.37)]">
          <div className="flex items-center justify-around max-w-sm mx-auto">
            <button 
              onClick={() => setActiveTab('home')}
              className={`p-3 transition-all duration-200 ${
                activeTab === 'home' ? 'text-white' : 'text-white/40'
              }`}
            >
              <HomeIcon className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`p-3 transition-all duration-200 ${
                activeTab === 'transactions' ? 'text-white' : 'text-white/40'
              }`}
            >
              <Bars3Icon className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setActiveTab('wallets')}
              className={`p-3 transition-all duration-200 ${
                activeTab === 'wallets' ? 'text-white' : 'text-white/40'
              }`}
            >
              <CreditCardIcon className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setActiveTab('apps')}
              className={`p-3 transition-all duration-200 ${
                activeTab === 'apps' ? 'text-white' : 'text-white/40'
              }`}
            >
              <RectangleStackIcon className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-3 transition-all duration-200 ${
                activeTab === 'settings' ? 'text-white' : 'text-white/40'
              }`}
            >
              <Cog6ToothIcon className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDeposit={handleDeposit}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSend={handleSend}
        currentBalance={walletStats.totalBalance}
      />
    </div>
  )
}

// Remove duplicate export - already exported above
