'use client'

import { useState } from 'react'
import { Users, Check, X, Clock } from 'lucide-react'

export function MultisigPanel() {
  const [pendingOperations] = useState([
    {
      id: '1',
      type: 'Mint',
      amount: '50,000 TZS',
      destination: 'rph2...ZM',
      requiredSignatures: 3,
      currentSignatures: 2,
      signers: ['Admin 1', 'Admin 2'],
      createdAt: '10 min ago',
      status: 'pending'
    },
    {
      id: '2',
      type: 'Burn',
      amount: '25,000 TZS',
      source: 'rAbc...XY',
      requiredSignatures: 3,
      currentSignatures: 1,
      signers: ['Admin 1'],
      createdAt: '25 min ago',
      status: 'pending'
    }
  ])

  const handleApprove = (operationId: string) => {
    console.log('Approving operation:', operationId)
  }

  const handleReject = (operationId: string) => {
    console.log('Rejecting operation:', operationId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Multisig Operations</h1>
        <p className="text-gray-600">Review and approve pending operations</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {pendingOperations.map((operation) => (
            <div key={operation.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      operation.type === 'Mint' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {operation.type}
                    </span>
                    <span className="text-lg font-semibold text-gray-900">{operation.amount}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        {operation.type === 'Mint' ? 'Destination' : 'Source'}
                      </label>
                      <p className="font-mono text-sm text-gray-900">
                        {operation.destination || operation.source}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm text-gray-900">{operation.createdAt}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Signatures</span>
                      <span className="text-sm text-gray-500">
                        {operation.currentSignatures}/{operation.requiredSignatures}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(operation.currentSignatures / operation.requiredSignatures) * 100}%` }}
                      ></div>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Signed by: </span>
                      <span className="text-sm text-gray-900">{operation.signers.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-6">
                  <button
                    onClick={() => handleApprove(operation.id)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(operation.id)}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
