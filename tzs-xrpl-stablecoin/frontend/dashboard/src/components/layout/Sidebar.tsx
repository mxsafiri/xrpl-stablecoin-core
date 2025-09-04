'use client'

import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, 
  Coins, 
  Wallet, 
  Activity, 
  Users, 
  Settings,
  Smartphone
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const adminNavigation = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'tokens', name: 'Token Operations', icon: Coins },
  { id: 'wallets', name: 'Wallets', icon: Wallet },
  { id: 'transactions', name: 'Transactions', icon: Activity },
  { id: 'multisig', name: 'Multisig', icon: Users },
]

const userNavigation = [
  { id: 'overview', name: 'My Wallet', icon: Wallet },
  { id: 'deposit', name: 'Deposit', icon: Smartphone },
  { id: 'transactions', name: 'My Transactions', icon: Activity },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { isAdmin } = useAuth()
  const navigation = isAdmin ? adminNavigation : userNavigation
  
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TZS</h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Admin Panel' : 'Stablecoin'}
            </p>
          </div>
        </div>
      </div>
      
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          )
        })}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Network</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Testnet
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
