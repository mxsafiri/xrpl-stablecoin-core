'use client'

import { Settings, User, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '../notifications/NotificationBell'

interface HeaderProps {
  isConnected: boolean
}

export function Header({ isConnected }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">TZS Dashboard</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected to XRPL' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* User Info */}
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.display_name || user?.username || `${user?.wallet_address?.slice(0, 8)}...${user?.wallet_address?.slice(-6)}`}
              </p>
              <p className="text-xs text-gray-500">
                {isAdmin ? '👑 Admin' : '👤 User'} • Balance: {user?.balance || 0} TZS
              </p>
            </div>
          </div>

          <NotificationBell />
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-600"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
