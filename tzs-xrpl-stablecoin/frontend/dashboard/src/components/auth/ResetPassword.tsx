'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<any>(null);

  const verifyToken = async () => {
    try {
      const response = await fetch('/.netlify/functions/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data.user);
      } else {
        setError(data.error || 'Invalid or expired reset token');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      setIsVerifying(false);
      return;
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/password-reset/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2A9D9F] mx-auto mb-4"></div>
            <p className="text-white/70">Verifying reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
          <div className="text-center p-6">
            <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">Invalid Reset Link</h2>
            <p className="text-white/70 text-sm">{error}</p>
          </div>
          <div className="p-6 pt-0">
            <button 
              onClick={() => router.push('/')}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/80 text-white rounded-lg py-3 px-4 font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
          <div className="text-center p-6">
            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">Password Reset Successful</h2>
            <p className="text-white/70 text-sm">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-center text-white/60 text-sm">
              Redirecting to login page in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
        <div className="text-center p-6">
          <div className="mx-auto w-12 h-12 bg-[#2A9D9F]/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-[#2A9D9F]" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Reset Password</h2>
          {userData && (
            <p className="text-white/70 text-sm">
              Setting new password for {userData.username}
            </p>
          )}
        </div>
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
              />
              <button
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
              />
            </div>

            <div className="text-xs text-white/60">
              Password must be at least 8 characters long
            </div>
            
            {error && (
              <div className="text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/80 text-white rounded-lg py-3 px-4 font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
