'use client'

import { useState } from 'react'
import { Activity, Filter, RefreshCw } from 'lucide-react'

export function TransactionMonitor() {
  const [filter, setFilter] = useState('all')
  
  const transactions = [
    { hash: '1A2B3C4D5E6F...', type: 'Mint', amount: '10,000 TZS', from: 'Treasury', to: 'rph2...ZM', status: 'Validated', time: '2 min ago' },
    { hash: '2B3C4D5E6F7G...', type: 'Transfer', amount: '5,000 TZS', from: 'rAbc...XY', to: 'rDef...AB', status: 'Validated', time: '5 min ago' },
    { hash: '3C4D5E6F7G8H...', type: 'Burn', amount: '2,500 TZS', from: 'rGhi...CD', to: 'Treasury', status: 'Pending', time: '8 min ago' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Monitor</h1>
          <p className="text-gray-600">Real-time XRPL transaction tracking</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Live Transactions</h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="mint">Mint</option>
            <option value="burn">Burn</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{tx.hash}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      tx.type === 'Mint' ? 'bg-green-100 text-green-800' :
                      tx.type === 'Burn' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{tx.from}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{tx.to}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      tx.status === 'Validated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
