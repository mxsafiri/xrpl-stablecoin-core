'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface DepositFormData {
  amount: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
}

interface DepositStatus {
  order_id: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  created_at: string;
}

export default function DepositPanel() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<DepositFormData>({
    amount: '',
    buyer_name: user?.display_name || user?.username || '',
    buyer_email: user?.email || '',
    buyer_phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [error, setError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.amount || parseFloat(formData.amount) < 1000) {
      setError('Minimum deposit amount is 1,000 TZS');
      return false;
    }
    if (!formData.buyer_name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.buyer_email.trim() || !formData.buyer_email.includes('@')) {
      setError('Valid email address is required');
      return false;
    }
    if (!formData.buyer_phone.match(/^07\d{8}$/)) {
      setError('Phone number must be in format 07XXXXXXXX');
      return false;
    }
    return true;
  };

  const handleDeposit = async () => {
    setError('');
    
    if (!validateForm()) return;
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/.netlify/functions/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          buyer_email: formData.buyer_email,
          buyer_name: formData.buyer_name,
          buyer_phone: formData.buyer_phone
        })
      });

      const result = await response.json();

      if (result.success) {
        setDepositStatus({
          order_id: result.order_id,
          status: 'pending',
          amount: result.amount,
          created_at: new Date().toISOString()
        });
        
        // Clear form
        setFormData(prev => ({
          ...prev,
          amount: '',
          buyer_phone: ''
        }));

        // Refresh wallet data to show updated balance and transactions
        if ((window as any).refreshWalletData) {
          setTimeout(() => {
            (window as any).refreshWalletData();
          }, 2000); // Wait 2 seconds for deposit to be processed
        }
      } else {
        setError(result.message || 'Deposit initiation failed');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
      console.error('Deposit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Money Deposit
          </CardTitle>
          <CardDescription>
            Deposit Tanzanian Shillings via M-Pesa, Tigo Pesa, or Airtel Money to your TumaBure wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exchange Rate Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Exchange Rate</span>
            </div>
            <p className="text-sm text-blue-700">
              1 TZS = 1 TZS in your TumaBure wallet (1:1 peg)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Minimum deposit: 1,000 TZS
            </p>
          </div>

          {/* Deposit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount (TZS) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="e.g., 10000"
                min="1000"
                step="100"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="buyer_phone"
                value={formData.buyer_phone}
                onChange={handleInputChange}
                placeholder="07XXXXXXXX"
                pattern="^07\d{8}$"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="buyer_name"
                value={formData.buyer_name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="buyer_email"
                value={formData.buyer_email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleDeposit}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Initiate Deposit'}
          </Button>

          {/* Deposit Status */}
          {depositStatus && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Deposit Initiated</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>Order ID: <code className="bg-green-100 px-1 rounded">{depositStatus.order_id}</code></p>
                <p>Amount: {formatCurrency(depositStatus.amount)}</p>
                <p>Status: <Badge variant="secondary">Pending Payment</Badge></p>
              </div>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Next Steps</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  You will receive a mobile money prompt on {formData.buyer_phone}. 
                  Complete the payment to receive money in your TumaBure wallet.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Mobile Money Deposits Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium mb-1">Initiate Deposit</h4>
              <p className="text-sm text-gray-600">Enter amount and phone number</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium mb-1">Complete Payment</h4>
              <p className="text-sm text-gray-600">Follow mobile money prompt</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium mb-1">Receive Money</h4>
              <p className="text-sm text-gray-600">Money credited to TumaBure wallet instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
