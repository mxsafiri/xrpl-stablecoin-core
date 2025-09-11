'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowDownIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (recipient: string, amount: number, note?: string) => Promise<void>
  currentBalance: number
}

interface User {
  id: string
  username: string
  wallet_address: string
}

export default function SendModal({ isOpen, onClose, onSend, currentBalance }: SendModalProps) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [recipientUser, setRecipientUser] = useState<User | null>(null)
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const quickAmounts = [1000, 5000, 10000, 25000, 50000]

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString())
  }

  const handleClose = () => {
    setStep(1)
    setAmount('')
    setRecipient('')
    setRecipientUser(null)
    setNote('')
    setIsLoading(false)
    setIsSuccess(false)
    setSearchResults([])
    onClose()
  }

  const handleNext = () => {
    if (step === 1 && amount && parseFloat(amount) > 0 && parseFloat(amount) <= currentBalance) {
      setStep(2)
    } else if (step === 2 && recipientUser) {
      setStep(3)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch('/.netlify/functions/search-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleRecipientChange = (value: string) => {
    setRecipient(value)
    setRecipientUser(null)
    searchUsers(value)
  }

  const selectRecipient = (user: User) => {
    setRecipient(user.username)
    setRecipientUser(user)
    setSearchResults([])
  }

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0 || !recipientUser) return
    
    setIsLoading(true)
    try {
      await onSend(recipientUser.username, parseFloat(amount), note)
      setIsSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Send failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[24px] w-full max-w-md border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-white text-[20px] font-semibold">
            {isSuccess ? 'Transfer Complete!' : 'Send TZS'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Success State */}
        {isSuccess && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-white text-[18px] font-medium mb-2">Transfer Successful!</h3>
            <p className="text-white/70 text-[14px]">
              TZS {parseFloat(amount).toLocaleString()} sent to {recipientUser?.username}
            </p>
          </div>
        )}

        {/* Step 1: Amount Selection */}
        {!isSuccess && step === 1 && (
          <div className="p-6 space-y-6">
            {/* Balance Display */}
            <div className="bg-white/5 rounded-[16px] p-4 border border-white/10">
              <p className="text-white/70 text-[14px] mb-1">Available Balance</p>
              <p className="text-white text-[20px] font-semibold">TZS {currentBalance.toLocaleString()}</p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-white/70 text-[14px] font-medium mb-3">
                Enter Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  max={currentBalance}
                  className="w-full bg-white/10 border border-white/20 rounded-[16px] px-4 py-4 text-white text-[24px] font-medium placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent text-center"
                />
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 text-[18px]">
                  TZS
                </span>
              </div>
              {amount && parseFloat(amount) > currentBalance && (
                <p className="text-red-400 text-[13px] mt-2">Insufficient balance</p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <p className="text-white/70 text-[14px] font-medium mb-3">Quick Select</p>
              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.filter(amt => amt <= currentBalance).map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleAmountSelect(amt)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-[12px] py-3 text-white text-[14px] font-medium transition-all duration-200"
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleNext}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > currentBalance}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 disabled:bg-white/10 disabled:text-white/40 rounded-[16px] py-4 text-white text-[16px] font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowDownIcon className="w-5 h-5 rotate-[-90deg]" />
            </button>
          </div>
        )}

        {/* Step 2: Recipient Selection */}
        {!isSuccess && step === 2 && (
          <div className="p-6 space-y-6">
            {/* Recipient Search */}
            <div>
              <label className="block text-white/70 text-[14px] font-medium mb-3">
                Send To
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  placeholder="Search by username (e.g., John.TZS)"
                  className="w-full bg-white/10 border border-white/20 rounded-[16px] px-4 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                />
                <UserIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-white/5 rounded-[16px] border border-white/10 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectRecipient(user)}
                    className="w-full p-4 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <p className="text-white text-[16px] font-medium">{user.username}</p>
                    <p className="text-white/50 text-[12px] truncate">{user.wallet_address}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Recipient */}
            {recipientUser && (
              <div className="bg-[#2A9D9F]/10 border border-[#2A9D9F]/30 rounded-[16px] p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#2A9D9F]/20 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-[#2A9D9F]" />
                  </div>
                  <div>
                    <p className="text-white text-[16px] font-medium">{recipientUser.username}</p>
                    <p className="text-white/50 text-[12px] truncate">{recipientUser.wallet_address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Display */}
            <div className="bg-white/5 rounded-[16px] p-4 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-[14px]">Amount</span>
                <span className="text-[#2A9D9F] text-[18px] font-medium">TZS {parseFloat(amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleNext}
              disabled={!recipientUser}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 disabled:bg-white/10 disabled:text-white/40 rounded-[16px] py-4 text-white text-[16px] font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowDownIcon className="w-5 h-5 rotate-[-90deg]" />
            </button>

            {/* Back Button */}
            <button
              onClick={() => setStep(1)}
              className="w-full bg-white/10 hover:bg-white/20 rounded-[16px] py-3 text-white text-[14px] font-medium transition-all duration-200"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {!isSuccess && step === 3 && (
          <div className="p-6 space-y-6">
            {/* Transfer Summary */}
            <div className="bg-white/5 rounded-[16px] p-4 border border-white/10 space-y-4">
              <h3 className="text-white text-[16px] font-medium">Transfer Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70 text-[14px]">To</span>
                  <span className="text-white text-[14px] font-medium">{recipientUser?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-[14px]">Amount</span>
                  <span className="text-[#2A9D9F] text-[16px] font-medium">TZS {parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-[14px]">Fee</span>
                  <span className="text-white text-[14px]">Free</span>
                </div>
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-white/70 text-[14px] font-medium mb-3">
                Add Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                maxLength={100}
                className="w-full bg-white/10 border border-white/20 rounded-[16px] px-4 py-3 text-white text-[14px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 disabled:bg-white/10 disabled:text-white/40 rounded-[16px] py-4 text-white text-[16px] font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send TZS {parseFloat(amount).toLocaleString()}</span>
                </>
              )}
            </button>

            {/* Back Button */}
            <button
              onClick={() => setStep(2)}
              disabled={isLoading}
              className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 rounded-[16px] py-3 text-white text-[14px] font-medium transition-all duration-200"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
