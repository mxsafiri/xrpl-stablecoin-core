'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/lib/api'

interface User {
  id: string
  wallet_address: string
  role: string
  balance: number
  created_at: string
  username?: string
  display_name?: string
  email?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (walletAddress: string) => Promise<void>
  loginAsAdmin: () => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = user !== null
  const isAdmin = user?.role === 'admin'

  // Check for existing authentication on mount
  useEffect(() => {
    // Immediately stop loading to show the dashboard
    setLoading(false)
    
    // Optional: Try to restore previous session in background
    const savedWallet = localStorage.getItem('current_wallet')
    const savedRole = localStorage.getItem('user_role')
    
    if (savedWallet && savedRole) {
      // Use cached auth data without API validation for now
      setUser({
        id: savedWallet,
        wallet_address: savedWallet,
        role: savedRole,
        balance: 0,
        created_at: new Date().toISOString()
      })
    }
  }, [])

  const login = async (walletAddress: string) => {
    setLoading(true)
    try {
      const result = await authAPI.login(walletAddress)
      setUser(result.user)
    } finally {
      setLoading(false)
    }
  }

  const loginAsAdmin = async () => {
    setLoading(true)
    try {
      const result = await authAPI.loginAsAdmin()
      setUser(result.user)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin,
      login,
      loginAsAdmin,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
