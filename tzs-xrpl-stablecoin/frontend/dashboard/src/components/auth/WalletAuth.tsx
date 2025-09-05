'use client'

import { useState } from 'react'
import { createWallet, importWallet, signMessage, WalletInfo } from '@/lib/wallet'
import { authAPI } from '@/lib/api'
import { databaseAPI } from '@/lib/database'

interface WalletAuthProps {
  onAuthSuccess: (user: any) => void
}

export default function WalletAuth({ onAuthSuccess }: WalletAuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'import'>('login')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletSeed, setWalletSeed] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newWallet, setNewWallet] = useState<WalletInfo | null>(null)

  // Handle wallet login
  const handleLogin = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter your wallet address')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Attempting login with wallet:', walletAddress)
      const result = await authAPI.login(walletAddress)
      console.log('Login successful:', result)
      onAuthSuccess(result.user)
    } catch (err) {
      console.error('Login error:', err)
      setError(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle wallet registration
  const handleRegister = async () => {
    setLoading(true)
    setError('')

    try {
      // Create new XRPL wallet
      const wallet = await createWallet()
      setNewWallet(wallet)

      // Register wallet in database
      await registerWalletInDatabase(wallet.address, 'user')
      
      // Auto-login after registration
      const result = await authAPI.login(wallet.address)
      onAuthSuccess(result.user)
    } catch (err) {
      console.error('Registration error:', err)
      // Don't show error if wallet was created successfully
      if (!newWallet) {
        setError(`Registration failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle wallet import
  const handleImport = async () => {
    if (!walletSeed.trim()) {
      setError('Please enter your wallet seed')
      return
    }

    setLoading(true)
    setError('')

    try {
      const wallet = importWallet(walletSeed)
      
      // Check if wallet exists in database, if not register it
      try {
        await authAPI.login(wallet.address)
      } catch {
        // Wallet not in database, register it
        await registerWalletInDatabase(wallet.address, 'user')
      }
      
      const result = await authAPI.login(wallet.address)
      onAuthSuccess(result.user)
    } catch (err) {
      setError('Invalid wallet seed or registration failed')
    } finally {
      setLoading(false)
    }
  }

  // Register wallet in database
  const registerWalletInDatabase = async (address: string, role: string = 'user') => {
    await authAPI.register(address, role, username, displayName, email)
  }

  // Quick admin login for testing
  const handleAdminLogin = async () => {
    setLoading(true)
    try {
      const result = await authAPI.loginAsAdmin()
      onAuthSuccess(result.user)
    } catch (err) {
      setError('Admin login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">TZS Stablecoin</h2>
          <p className="mt-2 text-gray-600">Create your account or sign in</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {newWallet && (
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <h3 className="font-semibold text-green-800">Wallet Created Successfully!</h3>
            <p className="text-sm text-green-700 mt-2">
              <strong>Address:</strong> {newWallet.address}
            </p>
            <p className="text-sm text-green-700">
              <strong>Seed:</strong> {newWallet.seed}
            </p>
            <p className="text-xs text-green-600 mt-2">
              ⚠️ Save your seed phrase securely! You&apos;ll need it to access your wallet.
            </p>
            <button
              onClick={async () => {
                setWalletAddress(newWallet.address)
                await handleLogin()
              }}
              className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Continue to Dashboard
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded ${
                mode === 'login' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded ${
                mode === 'register' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('import')}
              className={`flex-1 py-2 px-4 rounded ${
                mode === 'import' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Import
            </button>
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your XRPL wallet address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Create your TZS Stablecoin account
              </p>
              
              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              <input
                type="text"
                placeholder="Your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="email"
                placeholder="Email address (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <button
                onClick={handleRegister}
                disabled={loading || !username.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
              
              <p className="text-xs text-gray-500">
                A secure wallet will be created automatically for your account
              </p>
            </div>
          )}

          {/* Import Form */}
          {mode === 'import' && (
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter your wallet seed phrase"
                value={walletSeed}
                onChange={(e) => setWalletSeed(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import Wallet'}
              </button>
            </div>
          )}

          {/* Quick Admin Login for Testing */}
          <div className="border-t pt-4">
            <button
              onClick={handleAdminLogin}
              disabled={loading}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              🔧 Quick Admin Login (Testing)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
