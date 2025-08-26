// Global type declarations for the TZS-XRPL Stablecoin project

// Declare modules that don't have type declarations
declare module 'dotenv' {
  export function config(options?: { path?: string }): void;
}

// Extend Knex types for migrations
declare module 'knex/types/tables' {
  interface Tables {
    users: {
      id: string;
      wallet_address: string;
      role: 'admin' | 'treasury' | 'user';
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    };
    collateral_ledger: {
      id: string;
      amount: number;
      reference_id: string;
      type: 'deposit' | 'withdrawal';
      bank_transaction_id: string | null;
      created_at: Date;
      updated_at: Date;
    };
    transactions: {
      id: string;
      xrpl_transaction_hash: string;
      type: 'mint' | 'burn' | 'transfer';
      from_wallet: string;
      to_wallet: string;
      amount: number;
      collateral_id: string | null;
      metadata: Record<string, any> | null;
      created_at: Date;
      updated_at: Date;
    };
    multisig_operations: {
      id: string;
      operation_type: 'mint' | 'burn' | 'config_change';
      operation_data: Record<string, any>;
      required_signatures: number;
      current_signatures: number;
      status: 'pending' | 'approved' | 'rejected' | 'executed';
      signers: string[];
      xrpl_transaction_hash: string | null;
      created_at: Date;
      updated_at: Date;
    };
    audit_logs: {
      id: string;
      action: string;
      actor_wallet: string;
      actor_role: 'admin' | 'treasury' | 'user' | 'system';
      details: Record<string, any>;
      ip_address: string | null;
      created_at: Date;
    };
  }
}

// Declare global types for Node.js
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    XRPL_NETWORK: 'testnet' | 'devnet' | 'mainnet';
    XRPL_ADMIN_SEED: string;
    XRPL_TREASURY_SEED: string;
    XRPL_ISSUER_ADDRESS: string;
    XRPL_CURRENCY_CODE: string;
    JWT_SECRET: string;
    JWT_EXPIRY: string;
    MULTISIG_QUORUM: string;
    MULTISIG_SIGNERS: string;
    LOG_LEVEL: string;
  }
}
