'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpIcon, ArrowDownIcon, SendIcon, RefreshCwIcon, Coins, Activity, Wallet } from 'lucide-react'
import { useRealTimeData } from '@/hooks/useRealTimeData'

export default function DashboardOverview() {
  const { stats, transactions, isLoading, refreshData } = useRealTimeData()

  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your TZS stablecoin operations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            XRPL Connected
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : Number(stats.totalSupply).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">TZS tokens issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">In Circulation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : Number(stats.circulation).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">TZS in active use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.activeWallets}</div>
            <p className="text-xs text-muted-foreground">Unique addresses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">24h Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.transactions24h}</div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="flex items-center justify-center">
              <Coins className="w-5 h-5 mr-2" />
              Mint Tokens
            </Button>
            <Button variant="destructive" className="flex items-center justify-center">
              <Activity className="w-5 h-5 mr-2" />
              Burn Tokens
            </Button>
            <Button variant="secondary" className="flex items-center justify-center">
              <Wallet className="w-5 h-5 mr-2" />
              Transfer Tokens
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCwIcon className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No recent transactions</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.hash} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'mint' ? 'bg-green-100 text-green-600' :
                      tx.type === 'burn' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {tx.type === 'mint' ? <ArrowUpIcon className="h-4 w-4" /> :
                       tx.type === 'burn' ? <ArrowDownIcon className="h-4 w-4" /> :
                       <SendIcon className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.from.slice(0, 8)}...{tx.from.slice(-6)} → {tx.to === 'N/A' ? 'N/A' : `${tx.to.slice(0, 8)}...${tx.to.slice(-6)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={tx.status === 'validated' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}>
                      {tx.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{tx.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
