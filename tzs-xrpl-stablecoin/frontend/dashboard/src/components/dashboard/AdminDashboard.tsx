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
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'multisig' | 'blockchain' | 'users'>('overview');
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
      const statsResponse = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/.netlify/functions/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Total Users</p>
                    <p className="text-2xl font-bold text-white">{adminStats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-[#2A9D9F]" />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Total Supply</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(adminStats.totalSupply)}</p>
                  </div>
                  <Coins className="h-8 w-8 text-[#2A9D9F]" />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Monthly Volume</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(adminStats.monthlyVolume)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-[#2A9D9F]" />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Pending Deposits</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(adminStats.pendingDeposits)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Pending Operations</p>
                    <p className="text-2xl font-bold text-white">{adminStats.pendingOperations}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">User Balances</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(adminStats.totalBalance)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-[#2A9D9F]" />
                </div>
              </div>
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
                    onClick={() => setActiveTab('blockchain')}
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                  >
                    <Activity className="h-6 w-6" />
                    Monitor Blockchain
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

      case 'blockchain':
        return <TransactionMonitor />;

      case 'users':
        return <UserManagement />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-[#2A9D9F] rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#2A9D9F] rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 space-y-4">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-[#2A9D9F] to-[#1e7a7c] text-white p-4 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-3 mb-1">
            <Shield className="h-6 w-6" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-white/90 text-sm">
            Treasury management, multi-signature operations, and system oversight.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm p-1 rounded-2xl overflow-x-auto border border-white/20">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'operations', label: 'Token Ops', icon: Coins },
            { id: 'multisig', label: 'Multi-Sig', icon: Shield },
            { id: 'blockchain', label: 'Blockchain', icon: Activity },
            { id: 'users', label: 'Users', icon: Users }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#2A9D9F] text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
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
    </div>
  );
}
