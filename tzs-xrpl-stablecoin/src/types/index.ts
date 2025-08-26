// XRPL Types
export interface XrplWallet {
  address: string;
  seed: string;
  publicKey: string;
  privateKey: string;
}

export interface TokenConfig {
  issuerAddress: string;
  currencyCode: string;
  limit?: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  result?: any;
}

// Database Types
export interface User {
  id: string;
  wallet_address: string;
  role: 'admin' | 'treasury' | 'user';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CollateralEntry {
  id: string;
  amount: number;
  reference_id: string;
  type: 'deposit' | 'withdrawal';
  bank_transaction_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  xrpl_transaction_hash: string;
  type: 'mint' | 'burn' | 'transfer';
  from_wallet: string;
  to_wallet: string;
  amount: number;
  collateral_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface MultisigOperation {
  id: string;
  operation_type: 'mint' | 'burn' | 'config_change';
  operation_data: Record<string, any>;
  required_signatures: number;
  current_signatures: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  signers: string[];
  xrpl_transaction_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_wallet: string;
  actor_role: 'admin' | 'treasury' | 'user' | 'system';
  details: Record<string, any>;
  ip_address?: string;
  created_at: Date;
}

// API Types
export interface MintRequest {
  amount: number;
  destination_wallet: string;
  reference_id: string;
  bank_transaction_id?: string;
}

export interface BurnRequest {
  amount: number;
  source_wallet: string;
  reference_id: string;
}

export interface TransferRequest {
  amount: number;
  source_wallet: string;
  destination_wallet: string;
}

export interface MultisigApprovalRequest {
  operation_id: string;
  signer_wallet: string;
  signature: string;
}

// Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  xrplNetwork: 'testnet' | 'devnet' | 'mainnet';
  adminSeed: string;
  treasurySeed: string;
  issuerAddress: string;
  currencyCode: string;
  jwtSecret: string;
  jwtExpiry: string;
  multisigQuorum: number;
  multisigSigners: number;
  logLevel: string;
}
