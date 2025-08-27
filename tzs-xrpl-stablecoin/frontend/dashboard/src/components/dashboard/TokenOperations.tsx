'use client'

import { useState } from 'react'
import { Coins, Flame, ArrowRightLeft, Plus } from 'lucide-react'

export function TokenOperations() {
  const [activeOperation, setActiveOperation] = useState<'mint' | 'burn' | 'transfer'>('mint')
  const [formData, setFormData] = useState({
    amount: '',
    destinationWallet: '',
    sourceWallet: '',
    reference: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log(`${activeOperation} operation:`, formData)
    // Here you would call your backend API
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Token Operations</h1>
        <p className="text-gray-600">Mint, burn, and transfer TZS tokens</p>
      </div>

      {/* Operation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'mint', name: 'Mint Tokens', icon: Plus, color: 'text-green-600' },
              { id: 'burn', name: 'Burn Tokens', icon: Flame, color: 'text-red-600' },
              { id: 'transfer', name: 'Transfer Tokens', icon: ArrowRightLeft, color: 'text-blue-600' }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveOperation(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeOperation === tab.id
                      ? `border-blue-500 ${tab.color}`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (TZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Coins className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Conditional Fields */}
            {activeOperation === 'mint' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Wallet
                </label>
                <input
                  type="text"
                  value={formData.destinationWallet}
                  onChange={(e) => setFormData({ ...formData, destinationWallet: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  required
                />
              </div>
            )}

            {activeOperation === 'burn' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Wallet
                </label>
                <input
                  type="text"
                  value={formData.sourceWallet}
                  onChange={(e) => setFormData({ ...formData, sourceWallet: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  required
                />
              </div>
            )}

            {activeOperation === 'transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Wallet
                  </label>
                  <input
                    type="text"
                    value={formData.sourceWallet}
                    onChange={(e) => setFormData({ ...formData, sourceWallet: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Wallet
                  </label>
                  <input
                    type="text"
                    value={formData.destinationWallet}
                    onChange={(e) => setFormData({ ...formData, destinationWallet: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    required
                  />
                </div>
              </div>
            )}

            {/* Reference ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference ID (Optional)
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reference ID"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  activeOperation === 'mint' ? 'bg-green-600 hover:bg-green-700' :
                  activeOperation === 'burn' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {activeOperation === 'mint' ? 'Mint Tokens' :
                 activeOperation === 'burn' ? 'Burn Tokens' :
                 'Transfer Tokens'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Operation History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Operations</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { type: 'Mint', amount: '10,000', wallet: 'rph2...ZM', status: 'Completed', time: '2 min ago' },
              { type: 'Transfer', amount: '5,000', wallet: 'rAbc...XY', status: 'Pending', time: '5 min ago' },
              { type: 'Burn', amount: '2,500', wallet: 'rDef...AB', status: 'Completed', time: '12 min ago' }
            ].map((op, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    op.type === 'Mint' ? 'bg-green-100' :
                    op.type === 'Burn' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {op.type === 'Mint' ? <Plus className="w-5 h-5 text-green-600" /> :
                     op.type === 'Burn' ? <Flame className="w-5 h-5 text-red-600" /> :
                     <ArrowRightLeft className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{op.type} {op.amount} TZS</p>
                    <p className="text-sm text-gray-500 font-mono">{op.wallet}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    op.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {op.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">{op.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
