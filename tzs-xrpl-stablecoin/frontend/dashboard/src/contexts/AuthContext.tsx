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
  national_id?: string
  is_active?: boolean
  wallet_secret?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (walletAddress: string) => Promise<void>
  modernLogin: (username: string, password: string) => Promise<void>
  modernSignup: (formData: any) => Promise<void>
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
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user_data')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
    
    // Fallback to legacy wallet auth
    const savedWallet = localStorage.getItem('current_wallet')
    const savedRole = localStorage.getItem('user_role')
    
    if (!token && savedWallet && savedRole) {
      login(savedWallet).catch(() => {
        localStorage.removeItem('current_wallet')
        localStorage.removeItem('user_role')
      }).finally(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (walletAddress: string) => {
    setLoading(true)
    try {
      const result = await authAPI.login(walletAddress)
      setUser(result.user)
      // Store auth data in localStorage for persistence
      localStorage.setItem('current_wallet', walletAddress)
      localStorage.setItem('user_role', result.user.role)
    } catch (error) {
      console.error('Login failed:', error)
      throw error // Re-throw so WalletAuth can handle it
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

  const modernLogin = async (username: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch('/.netlify/functions/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store JWT token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      setUser(data.user)
    } catch (error) {
      console.error('Modern login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const modernSignup = async (formData: any) => {
    setLoading(true)
    try {
      const response = await fetch('/.netlify/functions/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      // Store JWT token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      setUser(data.user)
    } catch (error) {
      console.error('Modern signup failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    authAPI.logout()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin,
      login,
      modernLogin,
      modernSignup,
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
