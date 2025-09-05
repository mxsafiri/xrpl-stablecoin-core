'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Wallet, 
  CreditCard, 
  Send, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  CheckCircle,
  AlertCircle,
  Smartphone 
} from 'lucide-react';
import DepositPanel from './DepositPanel';
import { WithdrawPanel } from './WithdrawPanel';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  created_at: string;
  reference?: string;
}

interface WalletStats {
  totalBalance: number;
  pendingDeposits: number;
  totalTransactions: number;
  monthlySpending: number;
}

export default function UserWallet() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'send' | 'history'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalBalance: 0,
    pendingDeposits: 0,
    totalTransactions: 0,
    monthlySpending: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      // Get the current user balance directly from user object
      let currentBalance = 0;
      if (user?.balance) {
        currentBalance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
      }
      
      console.log('User balance from auth:', user?.balance, 'Parsed:', currentBalance);
      
      // Always try to fetch fresh balance from database for accuracy
      if (user?.wallet_address) {
        try {
          const balanceResponse = await fetch(`/.netlify/functions/database/balance/${user.wallet_address}`);
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            const freshBalance = parseFloat(balanceData.tzsBalance || '0');
            console.log('Fresh balance from database:', freshBalance);
            // Use the fresh balance if it's different from cached balance
            if (freshBalance !== currentBalance) {
              currentBalance = freshBalance;
            }
          }
        } catch (balanceError) {
          console.log('Could not fetch fresh balance:', balanceError);
        }
      }

      // Load user transactions and stats
      const response = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getUserTransactions',
          user_id: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setWalletStats({
          totalBalance: currentBalance,
          pendingDeposits: data.pendingDeposits || 0,
          totalTransactions: data.transactions?.length || 0,
          monthlySpending: data.monthlySpending || 0
        });
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
      case 'transfer':
      case 'payment':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Your TZS Stablecoin Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(walletStats.totalBalance)}
                </div>
                <p className="text-sm text-gray-600">
                  Available for spending and transfers
                </p>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Deposits</p>
                      <p className="text-xl font-semibold">{formatCurrency(walletStats.pendingDeposits)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Transactions</p>
                      <p className="text-xl font-semibold">{walletStats.totalTransactions}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-xl font-semibold">{formatCurrency(walletStats.monthlySpending)}</p>
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest wallet activity</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Make your first deposit to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(tx.type)}
                          <div>
                            <p className="font-medium capitalize">{tx.type}</p>
                            <p className="text-sm text-gray-600">{tx.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(tx.status)}
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'deposit':
        return <DepositPanel />;

      case 'withdraw':
        return <WithdrawPanel userBalance={walletStats.totalBalance} onWithdrawSuccess={loadWalletData} />;

      case 'send':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send TZS Stablecoin
              </CardTitle>
              <CardDescription>
                Transfer stablecoin to another wallet or make payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient Address</label>
                  <input
                    type="text"
                    placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (TZS)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Payment for..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button className="w-full" disabled>
                  Send Payment (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'history':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete history of your wallet transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No transaction history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <p className="font-medium capitalize">{tx.type}</p>
                          <p className="text-sm text-gray-600">{tx.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString('en-TZ', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(tx.status)}
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </div>
                        {tx.reference && (
                          <p className="text-xs text-gray-500 mt-1">Ref: {tx.reference}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {user?.display_name || user?.username || 'User'}!
        </h1>
        <p className="text-blue-100">
          Manage your TZS Stablecoin wallet, make deposits, and track your transactions.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: Wallet },
          { id: 'deposit', label: 'Deposit', icon: Smartphone },
          { id: 'send', label: 'Send', icon: Send },
          { id: 'history', label: 'History', icon: Clock }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
