import dotenv from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables
dotenv.config();

const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // XRPL Configuration
  xrplNetwork: (process.env.XRPL_NETWORK as 'testnet' | 'devnet' | 'mainnet') || 'testnet',
  adminSeed: process.env.XRPL_ADMIN_SEED || '',
  treasurySeed: process.env.XRPL_TREASURY_SEED || '',
  issuerAddress: process.env.XRPL_ISSUER_ADDRESS || '',
  currencyCode: process.env.XRPL_CURRENCY_CODE || 'TZS',
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  
  // Multisig Configuration
  multisigQuorum: Number(process.env.MULTISIG_QUORUM) || 2,
  multisigSigners: Number(process.env.MULTISIG_SIGNERS) || 3,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate critical configuration
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'XRPL_ADMIN_SEED',
    'XRPL_TREASURY_SEED',
    'XRPL_ISSUER_ADDRESS',
    'JWT_SECRET'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export default config;
