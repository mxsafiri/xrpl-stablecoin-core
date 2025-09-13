'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Shield, 
  User, 
  Eye, 
  EyeOff, 
  Crown,
  Wallet,
  Calendar,
  DollarSign
} from 'lucide-react';

interface UserData {
  id: string;
  wallet_address: string;
  role: string;
  balance: string;
  username: string;
  display_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'getAllUsers' })
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to load users:', response.status);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'updateUserRole', 
          user_id: userId, 
          new_role: newRole 
        })
      });

      if (response.ok) {
        loadUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/.netlify/functions/database', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'toggleUserStatus', 
          user_id: userId 
        })
      });

      if (response.ok) {
        loadUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'user':
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions across the TZS platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Total Users: <span className="font-semibold">{users.length}</span>
              </div>
              <div className="text-sm text-gray-600">
                Active: <span className="font-semibold">{users.filter(u => u.is_active).length}</span>
              </div>
              <div className="text-sm text-gray-600">
                Admins: <span className="font-semibold">{users.filter(u => u.role === 'admin').length}</span>
              </div>
            </div>
            <Button onClick={loadUsers} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View and manage all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading users...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.display_name || user.username || 'Unnamed User'}
                            </span>
                            <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </Badge>
                            {!user.is_active && (
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(user.balance)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(user.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role Toggle */}
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Status Toggle */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleUserStatus(user.id)}
                        className="flex items-center gap-1"
                      >
                        {user.is_active ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {user.email && (
                    <div className="mt-2 text-sm text-gray-600">
                      Email: {user.email}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
