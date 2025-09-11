'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  WalletIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface WalletsPanelProps {
  onBack: () => void
}

export default function WalletsPanel({ onBack }: WalletsPanelProps) {
  const { user } = useAuth()
  const [showWalletAddress, setShowWalletAddress] = useState(false)
  const [showWalletSecret, setShowWalletSecret] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return 'Not available'
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

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
          <h1 className="text-[24px] font-medium text-white">My Wallets</h1>
        </div>

        {/* Main Wallet */}
        <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15] mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#2A9D9F]/20 rounded-full flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-[#2A9D9F]" />
              </div>
              <div>
                <h3 className="text-white text-[18px] font-medium">Primary Wallet</h3>
                <p className="text-white/60 text-[14px]">XRPL Testnet</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#2A9D9F] text-[20px] font-medium">TZS {user?.balance || '0.00'}</p>
              <p className="text-white/60 text-[14px]">Available Balance</p>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/70 text-[14px] font-medium">Wallet Address</label>
                <button
                  onClick={() => setShowWalletAddress(!showWalletAddress)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {showWalletAddress ? (
                    <EyeSlashIcon className="w-4 h-4 text-white/60" />
                  ) : (
                    <EyeIcon className="w-4 h-4 text-white/60" />
                  )}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-white/10 border border-white/20 rounded-[12px] px-4 py-3">
                  <span className="text-white text-[14px] font-mono">
                    {showWalletAddress 
                      ? user?.wallet_address || 'Not available'
                      : truncateAddress(user?.wallet_address || '')
                    }
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(user?.wallet_address || '', 'address')}
                  className="p-3 bg-[#2A9D9F]/20 hover:bg-[#2A9D9F]/30 rounded-[12px] transition-colors"
                >
                  <DocumentDuplicateIcon className="w-5 h-5 text-[#2A9D9F]" />
                </button>
              </div>
              {copied === 'address' && (
                <p className="text-[#2A9D9F] text-[12px] mt-1">Address copied to clipboard!</p>
              )}
            </div>

            {/* Wallet Secret (if available) */}
            {user?.wallet_secret && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/70 text-[14px] font-medium">Wallet Secret</label>
                  <button
                    onClick={() => setShowWalletSecret(!showWalletSecret)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {showWalletSecret ? (
                      <EyeSlashIcon className="w-4 h-4 text-white/60" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-white/60" />
                    )}
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-white/10 border border-white/20 rounded-[12px] px-4 py-3">
                    <span className="text-white text-[14px] font-mono">
                      {showWalletSecret 
                        ? user.wallet_secret
                        : '••••••••••••••••••••••••••••••••'
                      }
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.wallet_secret || '', 'secret')}
                    className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-[12px] transition-colors"
                  >
                    <DocumentDuplicateIcon className="w-5 h-5 text-red-400" />
                  </button>
                </div>
                {copied === 'secret' && (
                  <p className="text-red-400 text-[12px] mt-1">Secret copied to clipboard!</p>
                )}
                <p className="text-red-400/80 text-[12px] mt-2">
                  ⚠️ Keep your wallet secret secure. Never share it with anyone.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button className="backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[20px] p-6 border border-white/[0.15] transition-colors">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-[#2A9D9F]/20 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-[#2A9D9F]" />
              </div>
              <div className="text-center">
                <p className="text-white text-[16px] font-medium">Deposit</p>
                <p className="text-white/60 text-[14px]">Add funds</p>
              </div>
            </div>
          </button>

          <button className="backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[20px] p-6 border border-white/[0.15] transition-colors">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <BanknotesIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-[16px] font-medium">Withdraw</p>
                <p className="text-white/60 text-[14px]">Send funds</p>
              </div>
            </div>
          </button>
        </div>

        {/* Wallet Stats */}
        <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15] mb-6">
          <h3 className="text-white text-[16px] font-medium mb-4">Wallet Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-white/60 text-[14px]">Total Received</p>
              <p className="text-[#2A9D9F] text-[18px] font-medium">TZS 0.00</p>
            </div>
            <div className="text-center">
              <p className="text-white/60 text-[14px]">Total Sent</p>
              <p className="text-red-400 text-[18px] font-medium">TZS 0.00</p>
            </div>
          </div>
        </div>

        {/* Add New Wallet */}
        <button className="w-full backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[20px] p-6 border border-white/[0.15] border-dashed transition-colors">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <PlusIcon className="w-6 h-6 text-white/60" />
            </div>
            <div className="text-center">
              <p className="text-white text-[16px] font-medium">Add New Wallet</p>
              <p className="text-white/60 text-[14px]">Import or create a new wallet</p>
            </div>
          </div>
        </button>

        {/* Security Notice */}
        <div className="mt-6 backdrop-blur-lg bg-red-500/10 rounded-[20px] p-4 border border-red-500/20">
          <h4 className="text-red-400 text-[14px] font-medium mb-2">Security Notice</h4>
          <p className="text-red-400/80 text-[12px] leading-relaxed">
            Your wallet credentials are stored securely. Always verify recipient addresses before sending transactions. 
            TZS Stablecoin is not responsible for transactions sent to incorrect addresses.
          </p>
        </div>
      </div>
    </div>
  )
}
