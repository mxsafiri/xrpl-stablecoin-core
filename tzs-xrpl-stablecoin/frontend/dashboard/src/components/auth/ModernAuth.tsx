'use client'

import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon, IdentificationIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import ForgotPassword from './ForgotPassword'

interface AuthFormData {
  fullName: string
  username: string
  nationalId: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
}

export default function ModernAuth() {
  const { modernLogin, modernSignup, login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showLegacyLogin, setShowLegacyLogin] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [legacyWalletAddress, setLegacyWalletAddress] = useState('')
  const [formData, setFormData] = useState<AuthFormData>({
    fullName: '',
    username: '',
    nationalId: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  })
  const [signInData, setSignInData] = useState({
    username: '',
    password: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Handle username input - allow free typing, only clean up invalid characters
    if (name === 'username') {
      // Allow letters, dots, and preserve existing .TZS
      let cleanValue = value.replace(/[^a-zA-Z.]/g, '')
      setFormData(prev => ({ ...prev, [name]: cleanValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleUsernameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value && !value.includes('.TZS')) {
      // Auto-format when user leaves the field if they haven't included .TZS
      const cleanValue = value.replace(/[^a-zA-Z]/g, '')
      if (cleanValue.length > 0) {
        const formatted = cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1).toLowerCase() + '.TZS'
        setFormData(prev => ({ ...prev, username: formatted }))
      }
    }
  }

  const handleSignInInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSignInData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!isLogin) {
        // Validate signup form
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters')
          setIsLoading(false)
          return
        }
      }

      if (isLogin) {
        // Use modern login from auth context
        await modernLogin(signInData.username, signInData.password)
      } else {
        // Use modern signup from auth context
        await modernSignup(formData)
      }

      // Redirect to dashboard on success
      window.location.href = '/dashboard'
      
    } catch (error: any) {
      setError(error.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Show forgot password component
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-[#2A9D9F] rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#2A9D9F] rounded-full blur-3xl"></div>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-medium text-white leading-[36px] mb-2 tracking-tight">
            TumaBure
          </h1>
          <p className="text-white/60 text-[14px] leading-[18px] font-light">
            {isLogin ? 'Welcome back to your wallet' : 'Create your TumaBure account'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="backdrop-blur-2xl bg-white/[0.15] rounded-[32px] p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/[0.18]">
          {/* Tab Switcher */}
          <div className="flex mb-8 bg-white/[0.08] rounded-[16px] p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-[12px] text-[14px] font-medium transition-all duration-200 ${
                isLogin 
                  ? 'bg-[#2A9D9F] text-white shadow-[0_2px_8px_0_rgba(42,157,159,0.3)]' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-[12px] text-[14px] font-medium transition-all duration-200 ${
                !isLogin 
                  ? 'bg-[#2A9D9F] text-white shadow-[0_2px_8px_0_rgba(42,157,159,0.3)]' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sign Up Fields */}
            {!isLogin && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-white/70 text-[14px] font-medium mb-3">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Your Full Name"
                      required={!isLogin}
                      className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-4 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-white/70 text-[14px] font-medium mb-3">
                    Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#2A9D9F] text-[16px] font-medium">
                      @
                    </span>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      onBlur={handleUsernameBlur}
                      placeholder="Name.TZS"
                      required={!isLogin}
                      className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-4 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                    />
                  </div>
                  <p className="text-white/40 text-[12px] mt-2">
                    Your unique TumaBure identity (e.g., Name.TZS)
                  </p>
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-white/70 text-[14px] font-medium mb-3">
                    National ID *
                  </label>
                  <div className="relative">
                    <IdentificationIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="text"
                      name="nationalId"
                      value={formData.nationalId}
                      onChange={handleInputChange}
                      placeholder="12345678"
                      required={!isLogin}
                      className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-4 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                    />
                  </div>
                  <p className="text-white/40 text-[12px] mt-2">
                    Required for KYC compliance
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white/70 text-[14px] font-medium mb-3">
                    Email Address *
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com"
                      required={!isLogin}
                      className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-4 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Sign In Fields */}
            {isLogin && (
              <>
                {/* Username */}
                <div>
                  <label className="block text-white/70 text-[14px] font-medium mb-3">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#2A9D9F] text-[16px] font-medium">
                      @
                    </span>
                    <input
                      type="text"
                      name="username"
                      value={signInData.username}
                      onChange={handleSignInInputChange}
                      placeholder="Name.TZS"
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-4 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-white/70 text-[14px] font-medium mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={signInData.password}
                      onChange={handleSignInInputChange}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-12 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Password (Sign Up) */}
            {!isLogin && (
              <div>
                <label className="block text-white/70 text-[14px] font-medium mb-3">
                  Password *
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required={!isLogin}
                    className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-12 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-[12px] p-4">
                <p className="text-red-300 text-[14px]">{error}</p>
              </div>
            )}

            {/* Confirm Password (Sign Up) */}
            {!isLogin && (
              <div>
                <label className="block text-white/70 text-[14px] font-medium mb-3">
                  Confirm Password *
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required={!isLogin}
                    className="w-full bg-white/10 border border-white/20 rounded-[16px] pl-12 pr-12 py-4 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 disabled:bg-[#2A9D9F]/50 rounded-[16px] py-4 text-white text-[16px] font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>

            {/* Forgot Password (Login) */}
            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-white/60 hover:text-white text-[14px] font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Terms (Sign Up) */}
            {!isLogin && (
              <div className="text-center">
                <p className="text-white/50 text-[12px] leading-[16px]">
                  By creating an account, you agree to our{' '}
                  <button className="text-[#2A9D9F] hover:underline">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button className="text-[#2A9D9F] hover:underline">
                    Privacy Policy
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
