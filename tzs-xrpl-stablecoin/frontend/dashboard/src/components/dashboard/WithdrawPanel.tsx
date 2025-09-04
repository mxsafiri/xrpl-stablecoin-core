'use client';

import React, { useState } from 'react';
import { ArrowUpRight, Smartphone, Coins, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface WithdrawPanelProps {
  userBalance: number;
  onWithdrawSuccess?: () => void;
}

interface WithdrawalResponse {
  success: boolean;
  message: string;
  withdrawal_id?: string;
  reference?: string;
  new_balance?: number;
  requires_approval?: boolean;
  estimated_usd?: number;
}

export function WithdrawPanel({ userBalance, onWithdrawSuccess }: WithdrawPanelProps) {
  const [withdrawalType, setWithdrawalType] = useState<'mobile_money' | 'xrpl_token'>('mobile_money');
  const [amount, setAmount] = useState('');
  const [withdrawalPhone, setWithdrawalPhone] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<WithdrawalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const withdrawAmount = parseFloat(amount);
      
      if (withdrawAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (withdrawAmount > userBalance) {
        throw new Error('Insufficient balance');
      }

      const payload = {
        user_id: 'current-user', // This should come from auth context
        amount: withdrawAmount,
        withdrawal_type: withdrawalType,
        ...(withdrawalType === 'mobile_money' 
          ? { withdrawal_phone: withdrawalPhone }
          : { destination_address: destinationAddress }
        )
      };

      const res = await fetch('/.netlify/functions/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setResponse(data);
      setAmount('');
      setWithdrawalPhone('');
      setDestinationAddress('');
      
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (withdrawalType === 'mobile_money' && !withdrawalPhone) return false;
    if (withdrawalType === 'xrpl_token' && !destinationAddress) return false;
    return true;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <ArrowUpRight className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Withdraw Funds</h2>
          <p className="text-sm text-gray-500">Convert your stablecoin balance to TZS or XRPL tokens</p>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Available Balance</span>
          <span className="text-lg font-bold text-gray-900">{userBalance.toLocaleString()} TZS</span>
        </div>
      </div>

      {/* Withdrawal Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Withdrawal Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setWithdrawalType('mobile_money')}
            className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
              withdrawalType === 'mobile_money'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Smartphone className="w-6 h-6" />
            <span className="text-sm font-medium">Mobile Money</span>
            <span className="text-xs text-gray-500">M-Pesa, Tigo Pesa, Airtel</span>
          </button>
          
          <button
            type="button"
            onClick={() => setWithdrawalType('xrpl_token')}
            className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
              withdrawalType === 'xrpl_token'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Coins className="w-6 h-6" />
            <span className="text-sm font-medium">XRPL Tokens</span>
            <span className="text-xs text-gray-500">Mint to wallet</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleWithdraw} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (TZS)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter amount to withdraw"
            min="1"
            max={userBalance}
            step="0.01"
            required
          />
        </div>

        {/* Conditional Fields */}
        {withdrawalType === 'mobile_money' && (
          <div>
            <label htmlFor="withdrawalPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Money Number
            </label>
            <input
              type="tel"
              id="withdrawalPhone"
              value={withdrawalPhone}
              onChange={(e) => setWithdrawalPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="07XXXXXXXX"
              pattern="07[0-9]{8}"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Tanzanian mobile number (format: 07XXXXXXXX)
            </p>
          </div>
        )}

        {withdrawalType === 'xrpl_token' && (
          <div>
            <label htmlFor="destinationAddress" className="block text-sm font-medium text-gray-700 mb-1">
              XRPL Wallet Address
            </label>
            <input
              type="text"
              id="destinationAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the XRPL wallet address where tokens should be minted
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!validateForm() || isLoading}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <ArrowUpRight className="w-4 h-4" />
              <span>
                {withdrawalType === 'mobile_money' ? 'Send to Mobile Money' : 'Mint XRPL Tokens'}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Response Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Withdrawal Failed</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {response && response.success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            {response.requires_approval ? (
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-medium text-green-800">
                {response.requires_approval ? 'Withdrawal Pending Approval' : 'Withdrawal Initiated'}
              </h4>
              <p className="text-sm text-green-700 mt-1">{response.message}</p>
              {response.reference && (
                <p className="text-xs text-green-600 mt-2">
                  Reference: {response.reference}
                </p>
              )}
              {response.requires_approval && response.estimated_usd && (
                <p className="text-xs text-yellow-600 mt-1">
                  Large withdrawal (~${response.estimated_usd.toFixed(2)} USD) requires multi-signature approval
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Withdrawal Information:</p>
            <ul className="space-y-1 text-xs">
              <li>• Mobile money withdrawals are processed instantly</li>
              <li>• XRPL token withdrawals above $5,000 require admin approval</li>
              <li>• Failed withdrawals will be automatically refunded</li>
              <li>• Transaction fees may apply for mobile money transfers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
