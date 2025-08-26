'use client'

import { useState } from 'react'
import { Wallet, Copy, QrCode, Eye, EyeOff } from 'lucide-react'
import { useRealTimeData } from '@/hooks/useRealTimeData'

export function WalletManagement() {
  const [showSeed, setShowSeed] = useState(false)
  const { walletBalances, isLoading } = useRealTimeData()
  
  // Configuration from environment
  const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'rLh7ddit5RQ5YHsCV9Pixz68ydncq8rWz'
  const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'rPwmFYdgmtriNnobcgeEjKH4tTogYEwbE3'
  
  const wallets = [
    { 
      name: 'Admin Wallet', 
      address: ADMIN_ADDRESS, 
      balance: isLoading ? 'Loading...' : (walletBalances[ADMIN_ADDRESS] || '0.00 XRP'), 
      type: 'admin' 
    },
    { 
      name: 'Treasury Wallet', 
      address: TREASURY_ADDRESS, 
      balance: isLoading ? 'Loading...' : (walletBalances[TREASURY_ADDRESS] || '0.00 TZS'), 
      type: 'treasury' 
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
        <p className="text-gray-600">Manage your XRPL wallets and balances</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {wallets.map((wallet, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{wallet.name}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                wallet.type === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {wallet.type}
              </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded font-mono">
                    {wallet.address}
                  </code>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Balance</label>
                <p className="text-xl font-bold text-gray-900 mt-1">{wallet.balance}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
