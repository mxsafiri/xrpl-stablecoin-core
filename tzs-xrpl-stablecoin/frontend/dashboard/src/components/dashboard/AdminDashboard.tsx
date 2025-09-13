'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  Coins, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';
import { MultisigPanel } from './MultisigPanel';
import { TokenOperations } from './TokenOperations';
import { TransactionMonitor } from './TransactionMonitor';
import UserManagement from './UserManagement';

interface AdminStats {
  totalUsers: number;
  totalBalance: number;
  pendingDeposits: number;
  pendingOperations: number;
  monthlyVolume: number;
  totalSupply: number;
}

interface PendingOperation {
  id: string;
  operation_type: string;
  amount: number;
  recipient_address: string;
  status: string;
  created_at: string;
  description: string;
  approvals_count: number;
  required_approvals: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'multisig' | 'transactions' | 'users'>('overview');
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBalance: 0,
    pendingDeposits: 0,
    pendingOperations: 0,
    monthlyVolume: 0,
    totalSupply: 0
  });
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load admin statistics
      const token = localStorage.getItem('auth_token')
      const statsResponse = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'getAdminStats' })
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Admin stats loaded:', statsData);
        setAdminStats(statsData.stats || {
          totalUsers: 0,
          totalBalance: 0,
          pendingDeposits: 0,
          pendingOperations: 0,
          monthlyVolume: 0,
          totalSupply: 0
        });
      } else {
        console.error('Failed to load admin stats:', statsResponse.status);
      }

      // Load pending operations
      const opsResponse = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'getPendingOperations' })
      });

      if (opsResponse.ok) {
        const opsData = await opsResponse.json();
        console.log('Pending operations loaded:', opsData);
        setPendingOperations(opsData.operations || []);
      } else {
        console.error('Failed to load pending operations:', opsResponse.status);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAdminData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleApproveOperation = async (operationId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/.netlify/functions/database`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'approveOperation',
          operation_id: operationId,
          admin_id: user?.id
        })
      });

      if (response.ok) {
        loadAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to approve operation:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Admin Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold">{adminStats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Supply</p>
                      <p className="text-2xl font-bold">{formatCurrency(adminStats.totalSupply)}</p>
                    </div>
                    <Coins className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Volume</p>
                      <p className="text-2xl font-bold">{formatCurrency(adminStats.monthlyVolume)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Deposits</p>
                      <p className="text-2xl font-bold">{formatCurrency(adminStats.pendingDeposits)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Operations</p>
                      <p className="text-2xl font-bold">{adminStats.pendingOperations}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">User Balances</p>
                      <p className="text-2xl font-bold">{formatCurrency(adminStats.totalBalance)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Operations Alert */}
            {pendingOperations.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-5 w-5" />
                    Pending Multi-Signature Operations
                  </CardTitle>
                  <CardDescription className="text-yellow-700">
                    {pendingOperations.length} operation(s) require your approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingOperations.slice(0, 3).map((op) => (
                      <div key={op.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div>
                          <p className="font-medium capitalize">{op.operation_type}</p>
                          <p className="text-sm text-gray-600">{op.description}</p>
                          <p className="text-sm text-gray-500">
                            Amount: {formatCurrency(op.amount)} | 
                            Approvals: {op.approvals_count}/{op.required_approvals}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleApproveOperation(op.id)}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Approve
                        </Button>
                      </div>
                    ))}
                    {pendingOperations.length > 3 && (
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('multisig')}
                        className="w-full"
                      >
                        View All {pendingOperations.length} Pending Operations
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    onClick={() => setActiveTab('operations')}
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                  >
                    <Coins className="h-6 w-6" />
                    Token Operations
                  </Button>
                  <Button
                    onClick={() => setActiveTab('multisig')}
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                  >
                    <Shield className="h-6 w-6" />
                    Multi-Sig Panel
                  </Button>
                  <Button
                    onClick={() => setActiveTab('transactions')}
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                  >
                    <Activity className="h-6 w-6" />
                    Monitor Transactions
                  </Button>
                  <Button
                    onClick={() => setActiveTab('users')}
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                  >
                    <Users className="h-6 w-6" />
                    User Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'operations':
        return <TokenOperations />;

      case 'multisig':
        return <MultisigPanel />;

      case 'transactions':
        return <TransactionMonitor />;

      case 'users':
        return <UserManagement />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-red-100">
          Treasury management, multi-signature operations, and system oversight.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'operations', label: 'Token Ops', icon: Coins },
          { id: 'multisig', label: 'Multi-Sig', icon: Shield },
          { id: 'transactions', label: 'Transactions', icon: Activity },
          { id: 'users', label: 'Users', icon: Users }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'bg-white text-red-600 shadow-sm'
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
