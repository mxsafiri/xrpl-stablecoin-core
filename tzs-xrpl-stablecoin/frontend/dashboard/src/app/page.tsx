'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import UserWallet from '@/components/dashboard/UserWallet'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import ModernWalletDashboard from '@/components/wallet/ModernWalletDashboard'
import WalletAuth from '@/components/auth/WalletAuth'
import ModernAuth from '@/components/auth/ModernAuth'

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user')

  const handleAuthSuccess = (userData: any) => {
    console.log('User authenticated:', userData)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <ModernAuth />
  }

  // For admin users, show a simple toggle to access admin panel
  if (user.role === 'admin' && activeTab === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">TZS Admin Panel</h1>
            <button
              onClick={() => setActiveTab('user')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Wallet
            </button>
          </div>
          <AdminDashboard />
        </div>
      </div>
    )
  }

  // Default: Full-screen modern wallet with admin access button if needed
  return (
    <div className="relative">
      <ModernWalletDashboard />
      {user.role === 'admin' && (
        <button
          onClick={() => setActiveTab('admin')}
          className="fixed top-4 right-4 z-30 bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/30 transition-all"
        >
          Admin Panel
        </button>
      )}
    </div>
  )
}
