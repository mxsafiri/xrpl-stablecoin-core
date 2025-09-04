'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import DashboardOverview from '@/components/dashboard/DashboardOverview'
import { TokenOperations } from '@/components/dashboard/TokenOperations'
import { WalletManagement } from '@/components/dashboard/WalletManagement'
import { TransactionMonitor } from '@/components/dashboard/TransactionMonitor'
import { MultisigPanel } from '@/components/dashboard/MultisigPanel'
import DepositPanel from '@/components/dashboard/DepositPanel'
import UserWallet from '@/components/dashboard/UserWallet'
import { useAuth } from '@/contexts/AuthContext'
import WalletAuth from '@/components/auth/WalletAuth'

type ActiveTab = 'overview' | 'tokens' | 'wallets' | 'transactions' | 'multisig' | 'deposit'

export default function Dashboard() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize XRPL connection
    setIsConnected(true)
  }, [])

  const handleAuthSuccess = (userData: any) => {
    // Authentication handled by AuthContext
    console.log('User authenticated:', userData)
  }

  const renderContent = () => {
    if (isAdmin) {
      // Admin dashboard content
      switch (activeTab) {
        case 'overview':
          return <DashboardOverview />
        case 'tokens':
          return <TokenOperations />
        case 'wallets':
          return <WalletManagement />
        case 'transactions':
          return <TransactionMonitor />
        case 'multisig':
          return <MultisigPanel />
        default:
          return <DashboardOverview />
      }
    } else {
      // User wallet content
      switch (activeTab) {
        case 'overview':
          return <UserWallet />
        case 'deposit':
          return <DepositPanel />
        case 'transactions':
          return <TransactionMonitor />
        default:
          return <UserWallet />
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <WalletAuth onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={(tab: string) => setActiveTab(tab as ActiveTab)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header isConnected={isConnected} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
