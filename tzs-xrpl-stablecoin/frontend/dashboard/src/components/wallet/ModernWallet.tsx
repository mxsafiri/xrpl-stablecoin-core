'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface WalletStats {
  totalBalance: number
  pendingDeposits: number
  totalTransactions: number
  monthlySpending: number
}

export default function ModernWallet() {
  const { user } = useAuth()
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalBalance: 0,
    pendingDeposits: 0,
    totalTransactions: 0,
    monthlySpending: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'home' | 'accounts' | 'history'>('home')

  useEffect(() => {
    if (user) {
      loadWalletData()
    }
  }, [user])

  const loadWalletData = async () => {
    setIsLoading(true)
    try {
      let currentBalance = 0
      
      // Fetch fresh balance from database
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
          console.error('Could not fetch balance:', error)
        }
      }

      setWalletStats({
        totalBalance: currentBalance,
        pendingDeposits: 0,
        totalTransactions: 0,
        monthlySpending: 0
      })
    } catch (error) {
      console.error('Failed to load wallet data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatBalance = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toString()
  }

  if (activeView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Status Bar */}
        <div className="flex justify-between items-center p-4 pt-12 text-white text-sm">
          <span>9:41</span>
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-1 h-3 bg-white rounded"></div>
              <div className="w-1 h-3 bg-white rounded"></div>
              <div className="w-1 h-3 bg-white/50 rounded"></div>
              <div className="w-1 h-3 bg-white/50 rounded"></div>
            </div>
            <span className="ml-2">📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {user?.display_name?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <div>
                <p className="text-white/80 text-sm">Hello, {user?.display_name || user?.username || 'User'} 👋</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="p-2 bg-white/10 rounded-lg">
                <span className="text-white">📄</span>
              </button>
              <button className="p-2 bg-white/10 rounded-lg">
                <span className="text-white">💳</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="absolute right-3 top-3 text-white/60">
              <span>⚙️</span>
            </button>
          </div>

          {/* Balance Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-white/80 text-sm">Personal • TZS</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-white text-3xl font-bold">
                    {formatBalance(walletStats.totalBalance)}
                  </span>
                  <span className="text-white/60 text-lg">TZS</span>
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-lg">₸</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl py-3 px-4 text-white font-medium hover:bg-white/30 transition-colors">
                Accounts
              </button>
              <div className="flex space-x-2">
                <button className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors">
                  <span>↔️</span>
                </button>
                <button className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors">
                  <span>ℹ️</span>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => setActiveView('accounts')}
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              >
                <span className="text-lg">💰</span>
                <span className="text-sm">Add Money</span>
              </button>
              <button className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors">
                <span className="text-lg">⋯</span>
                <span className="text-sm">More</span>
              </button>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">History</h3>
            
            {/* Sample Transactions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🇸🇬</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">SGD • TZS</p>
                    <p className="text-white/60 text-xs">Today • 2:12</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">+{formatCurrency(32490)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🇺🇸</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">USD • SGD</p>
                    <p className="text-white/60 text-xs">Today • 2:12</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">-2</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🇸🇬</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">SGD • TZS</p>
                    <p className="text-white/60 text-xs">Today • 2:12</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">+{formatCurrency(32490)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-t border-white/10">
          <div className="flex justify-around py-4">
            <button className="flex flex-col items-center space-y-1">
              <span className="text-purple-400 text-xl">🏠</span>
            </button>
            <button className="flex flex-col items-center space-y-1">
              <span className="text-white/60 text-xl">↔️</span>
            </button>
            <button className="flex flex-col items-center space-y-1">
              <span className="text-white/60 text-xl">₿</span>
            </button>
            <button className="flex flex-col items-center space-y-1">
              <span className="text-white/60 text-xl">📊</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Accounts View
  if (activeView === 'accounts') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Status Bar */}
        <div className="flex justify-between items-center p-4 pt-12 text-white text-sm">
          <span>9:41</span>
          <div className="flex items-center space-x-1">
            <span>📶 🔋</span>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => setActiveView('home')}
              className="p-2 bg-white/10 rounded-lg"
            >
              <span className="text-white">←</span>
            </button>
            <h1 className="text-white text-lg font-semibold">Total wealth</h1>
            <div></div>
          </div>

          {/* Assets/Liabilities Toggle */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-8">
            <button className="flex-1 bg-white/20 rounded-lg py-2 text-white text-sm font-medium">
              Assets
            </button>
            <button className="flex-1 py-2 text-white/60 text-sm font-medium">
              Liabilities
            </button>
          </div>

          {/* Total Asset Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <div className="w-full h-full rounded-full border-8 border-purple-500/30"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-white/60 text-sm">Total Asset</p>
                <p className="text-white text-3xl font-bold">${formatBalance(walletStats.totalBalance / 2500)}</p>
              </div>
              <div className="absolute top-4 right-8">
                <span className="text-white text-sm">⚙️</span>
              </div>
            </div>
          </div>

          {/* Account List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">💰</span>
                </div>
                <div>
                  <p className="text-white font-medium">Cash</p>
                  <p className="text-white/60 text-sm">2 accounts</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">${(walletStats.totalBalance / 2500 * 0.6).toFixed(0)}</p>
                <p className="text-green-400 text-sm">+2%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">📈</span>
                </div>
                <div>
                  <p className="text-white font-medium">Invest</p>
                  <p className="text-white/60 text-sm">1 investment</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">${(walletStats.totalBalance / 2500 * 0.25).toFixed(0)}</p>
                <p className="text-red-400 text-sm">-3%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">₿</span>
                </div>
                <div>
                  <p className="text-white font-medium">Crypto</p>
                  <p className="text-white/60 text-sm">1 currency</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">${(walletStats.totalBalance / 2500 * 0.15).toFixed(0)}</p>
                <p className="text-green-400 text-sm">+5%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
