'use client';

import { useState } from 'react';
// Using inline components instead of shadcn/ui imports
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
          <div className="text-center p-6">
            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">Check Your Email</h2>
            <p className="text-white/70 text-sm">
              If an account with that email exists, we&apos;ve sent you a password reset link.
            </p>
          </div>
          <div className="p-6 pt-0">
            <button 
              onClick={onBack}
              className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-lg py-3 px-4 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </button>
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
            <Mail className="h-6 w-6 text-[#2A9D9F]" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Forgot Password?</h2>
          <p className="text-white/70 text-sm">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
              />
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
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button 
              type="button"
              onClick={onBack}
              className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-3 px-4 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
