export interface Wallet {
  name: string
  address: string
  balance: string
  type: 'admin' | 'treasury' | 'user'
}

export interface Transaction {
  hash: string
  type: 'mint' | 'burn' | 'transfer'
  amount: string
  from: string
  to: string
  status: 'pending' | 'validated' | 'failed'
  timestamp: string
}

export interface MultisigOperation {
  id: string
  type: 'mint' | 'burn' | 'config_change'
  amount?: string
  destination?: string
  source?: string
  requiredSignatures: number
  currentSignatures: number
  signers: string[]
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'executed'
}

export interface TokenStats {
  totalSupply: string
  circulation: string
  activeWallets: string
  transactions24h: string
}
