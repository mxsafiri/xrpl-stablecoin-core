'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowDownIcon, CheckIcon } from '@heroicons/react/24/outline'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDeposit: (amount: number, phone: string) => Promise<void>
}

export default function DepositModal({ isOpen, onClose, onDeposit }: DepositModalProps) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  console.log('DepositModal render - isOpen:', isOpen)

  const quickAmounts = [1000, 5000, 10000, 50000, 100000]

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString())
  }

  const handleNext = () => {
    if (step === 1 && amount && parseFloat(amount) >= 1000) {
      setStep(2)
    } else if (step === 2 && phone && phone.match(/^0(62|65|67|68|69|71|74|75|76|78)\d{7}$/)) {
      setStep(3)
    }
  }

  const handleSwipeToDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0 || !phone) return
    
    setIsLoading(true)
    try {
      await onDeposit(parseFloat(amount), phone)
      setIsSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Deposit failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setAmount('')
    setPhone('')
    setIsLoading(false)
    setIsSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] rounded-t-[32px] p-6 pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[24px] font-medium text-white tracking-tight">
            {step === 1 ? 'Deposit TZS' : step === 2 ? 'Phone Number' : step === 3 ? 'Confirm Deposit' : 'Success!'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Step 1: Amount Selection */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-white/70 text-[14px] font-medium mb-3">
                Enter Amount (Min: 1,000 TZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  min="1000"
                  className="w-full bg-white/10 border border-white/20 rounded-[16px] px-4 py-4 text-white text-[20px] font-medium placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 text-[16px] font-medium">
                  TZS
                </span>
              </div>
            </div>


            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-white/70 text-[14px] font-medium mb-3">
                Quick Select
              </label>
              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAmountSelect(value)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-[12px] py-3 text-white text-[14px] font-medium transition-all duration-200"
                  >
                    {value} TZS
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleNext}
              disabled={!amount || parseFloat(amount) < 1000}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 disabled:bg-white/10 disabled:text-white/40 rounded-[16px] py-4 text-white text-[16px] font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowDownIcon className="w-5 h-5 rotate-[-90deg]" />
            </button>
          </div>
        )}

        {/* Step 2: Phone Number */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Phone Number Input */}
            <div>
              <label className="block text-white/70 text-[14px] font-medium mb-3">
                Mobile Money Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0XXXXXXXXX (Vodacom, Airtel, Tigo, Halotel)"
                  pattern="^0(62|65|67|68|69|71|74|75|76|78)\d{7}$"
                  className="w-full bg-white/10 border border-white/20 rounded-[16px] px-4 py-4 text-white text-[18px] font-medium placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[24px]">
                  📱
                </span>
              </div>
              <p className="text-white/50 text-[13px] mt-3">
                Enter your M-Pesa, Tigo Pesa, or Airtel Money number
              </p>
            </div>

            {/* Amount Summary */}
            <div className="bg-white/5 rounded-[16px] p-4 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-[14px]">Amount</span>
                <span className="text-[#2A9D9F] text-[18px] font-medium">TZS {parseFloat(amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleNext}
              disabled={!phone || !phone.match(/^0(62|65|67|68|69|71|74|75|76|78)\d{7}$/)}
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
        {step === 3 && !isSuccess && (
          <div className="space-y-6">
            {/* Amount Summary */}
            <div className="bg-white/10 rounded-[20px] p-6 text-center">
              <p className="text-white/70 text-[14px] mb-2">You&apos;re depositing</p>
              <p className="text-[32px] font-medium text-[#2A9D9F] tracking-tight">
                TZS {parseFloat(amount).toLocaleString()}
              </p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/50 text-[12px] mb-1">Mobile Money Number</p>
                <p className="text-white text-[14px] font-medium">{phone}</p>
              </div>
            </div>

            {/* Swipe to Deposit */}
            <div className="relative">
              <div className="bg-white/10 rounded-[20px] p-2 border border-white/20">
                <button
                  onClick={handleSwipeToDeposit}
                  disabled={isLoading}
                  className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 disabled:bg-[#2A9D9F]/50 rounded-[16px] py-4 text-white text-[16px] font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownIcon className="w-5 h-5" />
                      <span>Tap to Deposit</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-center text-white/50 text-[12px] mt-3">
                You will receive a mobile money prompt on {phone}
              </p>
            </div>

            {/* Back Button */}
            <button
              onClick={() => setStep(2)}
              className="w-full bg-white/10 hover:bg-white/20 rounded-[16px] py-3 text-white text-[14px] font-medium transition-all duration-200"
            >
              Back
            </button>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-[#2A9D9F] rounded-full flex items-center justify-center mx-auto">
              <CheckIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-[20px] font-medium text-white mb-2">Deposit Successful!</h3>
              <p className="text-white/70 text-[14px]">
                TZS {parseFloat(amount).toLocaleString()} has been added to your wallet
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
