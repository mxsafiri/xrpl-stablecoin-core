'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { TokenOperations } from '@/components/dashboard/TokenOperations'
import { WalletManagement } from '@/components/dashboard/WalletManagement'
import { TransactionMonitor } from '@/components/dashboard/TransactionMonitor'
import { MultisigPanel } from '@/components/dashboard/MultisigPanel'

type ActiveTab = 'overview' | 'tokens' | 'wallets' | 'transactions' | 'multisig'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize XRPL connection
    setIsConnected(true)
  }, [])

  const renderContent = () => {
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
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header isConnected={isConnected} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
