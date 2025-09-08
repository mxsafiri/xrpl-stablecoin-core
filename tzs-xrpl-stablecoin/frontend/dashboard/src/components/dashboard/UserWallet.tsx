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
  xrplBalance: number;
  xrpBalance: number;
}

export default function UserWallet() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'send' | 'history'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalBalance: 0,
    pendingDeposits: 0,
    totalTransactions: 0,
    monthlySpending: 0,
    xrplBalance: 0,
    xrpBalance: 0
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
      
      console.log('UserWallet - User object:', user);
      console.log('UserWallet - User balance from auth:', user?.balance, 'Parsed:', currentBalance);
      
      // Always try to fetch fresh balance from database for accuracy
      if (user?.id) {
        try {
          const balanceResponse = await fetch('/.netlify/functions/database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getBalance',
              user_id: user.id
            })
          });
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            const freshBalance = parseFloat(balanceData.balance || '0');
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

      // Set the balance immediately regardless of transaction fetch
      console.log('Setting wallet stats with balance:', currentBalance);
      setWalletStats({
        totalBalance: currentBalance,
        pendingDeposits: 0,
        totalTransactions: 0,
        monthlySpending: 0,
        xrplBalance: 0,
        xrpBalance: 0
      });
      console.log('Wallet stats set, current totalBalance should be:', currentBalance);

      // Try to load user transactions separately (don't let this block balance display)
      try {
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
          // Update stats with transaction data but keep the balance
          setWalletStats(prev => ({
            ...prev,
            pendingDeposits: data.pendingDeposits || 0,
            totalTransactions: data.transactions?.length || 0,
            monthlySpending: data.monthlySpending || 0
          }));
        }
      } catch (transactionError) {
        console.log('Could not fetch transactions (balance still displayed):', transactionError);
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

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Digital Assets</p>
                      {isLoading ? (
                        <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold mt-1 text-blue-600">{formatCurrency(walletStats.totalBalance)}</p>
                      )}
                      <p className="text-xs mt-2 text-slate-500">Ready to transfer</p>
                    </div>
                    <div className="relative">
                      <div className="p-3 rounded-full bg-blue-50">
                        <Wallet className="h-6 w-6 text-blue-600" />
                      </div>
                      {walletStats.totalBalance > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Blockchain Balance</p>
                      {isLoading ? (
                        <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold mt-1 text-orange-500">{formatCurrency(walletStats.xrplBalance)}</p>
                      )}
                      <p className="text-xs mt-2 text-slate-500">Secured on XRPL</p>
                    </div>
                    <div className="relative">
                      <div className="p-3 rounded-full bg-orange-50">
                        <CreditCard className="h-6 w-6 text-orange-500" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Network Balance</p>
                      {isLoading ? (
                        <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold mt-1 text-green-600">{walletStats.xrpBalance} XRP</p>
                      )}
                      <p className="text-xs mt-2 text-slate-500">For transactions</p>
                    </div>
                    <div className="relative">
                      <div className="p-3 rounded-full bg-green-50">
                        <ArrowUpRight className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
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
                    {transactions.slice(0, 5).map((tx: any) => {
                      const isDeposit = tx.from_wallet === 'zenopay' || tx.from_wallet === 'fiat_balance';
                      const description = tx.metadata?.reference 
                        ? `ZenoPay Deposit (Ref: ${tx.metadata.reference})`
                        : tx.from_wallet === 'fiat_balance' 
                          ? 'Fiat to Token Conversion'
                          : `${tx.type} transaction`;
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(tx.type === 'mint' ? 'deposit' : tx.type)}
                            <div>
                              <p className="font-medium capitalize">{tx.type === 'mint' && isDeposit ? 'Deposit' : tx.type}</p>
                              <p className="text-sm text-gray-600">{description}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${isDeposit ? 'text-green-600' : 'text-blue-600'}`}>
                              +{formatCurrency(parseFloat(tx.amount.toString()))}
                            </p>
                            <div className="flex items-center gap-1 justify-end">
                              {getStatusIcon('completed')}
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
