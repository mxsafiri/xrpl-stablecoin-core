'use client'

import { useState, useEffect } from 'react'
import { Check, X, RefreshCw, LogIn } from 'lucide-react'
import { multisigAPI, authAPI } from '@/lib/api'

interface MultisigOperation {
  id: string
  operation_type: string
  operation_data: {
    amount?: number
    destinationWallet?: string
    sourceWallet?: string
  }
  required_signatures: number
  current_signatures: number
  status: string
  signers: string[]
  created_at: string
}

export function MultisigPanel() {
  const [pendingOperations, setPendingOperations] = useState<MultisigOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchPendingOperations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await multisigAPI.getPendingOperations()
      setPendingOperations(data.operations || [])
    } catch (err) {
      setError('Failed to fetch pending operations')
      console.error('Error fetching pending operations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem('auth_token')
    if (token) {
      setIsAuthenticated(true)
      fetchPendingOperations()
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = async () => {
    try {
      setLoading(true)
      await authAPI.loginAsAdmin()
      setIsAuthenticated(true)
      setError(null)
      await fetchPendingOperations()
    } catch (err) {
      setError('Failed to authenticate. Please try again.')
      console.error('Authentication error:', err)
      setLoading(false)
    }
  }

  const handleApprove = async (operationId: string) => {
    try {
      await multisigAPI.approve(operationId)
      // Refresh the list after approval
      fetchPendingOperations()
    } catch (err) {
      setError('Failed to approve operation')
      console.error('Error approving operation:', err)
    }
  }

  const handleReject = (operationId: string) => {
    console.log('Rejecting operation:', operationId)
    // Note: Backend doesn't have reject endpoint yet
  }

  const formatAmount = (amount?: number) => {
    return amount ? `${amount.toLocaleString()} TZS` : 'N/A'
  }

  const formatWallet = (wallet?: string) => {
    return wallet && wallet.length > 10 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet || 'N/A'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Multisig Operations</h1>
          <p className="text-gray-600">Review and approve pending operations</p>
        </div>
        <div className="flex space-x-3">
          {!isAuthenticated ? (
            <button
              onClick={handleLogin}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login as Admin
            </button>
          ) : (
            <button
              onClick={fetchPendingOperations}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
        </div>
        
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading pending operations...</p>
            </div>
          ) : pendingOperations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No pending operations
            </div>
          ) : (
            pendingOperations.map((operation) => (
              <div key={operation.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        operation.operation_type === 'mint' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {operation.operation_type.charAt(0).toUpperCase() + operation.operation_type.slice(1)}
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatAmount(operation.operation_data.amount)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          {operation.operation_type === 'mint' ? 'Destination' : 'Source'}
                        </label>
                        <p className="font-mono text-sm text-gray-900">
                          {formatWallet(operation.operation_data.destinationWallet || operation.operation_data.sourceWallet)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p className="text-sm text-gray-900">{formatTime(operation.created_at)}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Signatures</span>
                        <span className="text-sm text-gray-500">
                          {operation.current_signatures}/{operation.required_signatures}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(operation.current_signatures / operation.required_signatures) * 100}%` }}
                        ></div>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Signed by: </span>
                        <span className="text-sm text-gray-900">
                          {operation.signers.length > 0 ? operation.signers.join(', ') : 'None'}
                        </span>
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}
