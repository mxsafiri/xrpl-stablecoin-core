# TZS Stablecoin Wallet Service Specification

## Overview
Separate service responsible for XRPL blockchain operations, token custody, and treasury management.

## Responsibilities

### 1. XRPL Token Operations
- Mint TZS stablecoin tokens on XRPL
- Burn tokens for redemptions
- Transfer tokens between wallets
- Manage token supply and circulation

### 2. Wallet Management
- Generate and manage XRPL wallets
- Secure private key storage
- Multi-signature wallet operations
- Treasury wallet management

### 3. Security Features
- Hardware Security Module (HSM) integration
- Multi-signature transaction approval
- Cold storage for treasury funds
- Audit logging for all operations

### 4. API Endpoints

#### Mint Tokens
```
POST /api/mint
{
  "recipient_address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amount": 1000,
  "reference": "deposit_order_123",
  "approval_signatures": ["sig1", "sig2"] // For large amounts
}
```

#### Burn Tokens
```
POST /api/burn
{
  "from_address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amount": 1000,
  "reference": "withdrawal_order_456"
}
```

#### Get Balance
```
GET /api/balance/{address}
```

#### Transaction Status
```
GET /api/transaction/{tx_hash}
```

## Integration with Backend

### Flow for Deposits (TZS → Stablecoin)
1. User deposits TZS via ZenoPay → Backend credits database balance
2. User requests XRPL withdrawal → Backend calls wallet service `/api/mint`
3. Wallet service mints actual tokens to user's XRPL wallet
4. Backend updates transaction status

### Flow for Withdrawals (Stablecoin → TZS)
1. User burns XRPL tokens → Wallet service calls backend webhook
2. Backend credits user's TZS balance for withdrawal
3. User can withdraw TZS via mobile money

## Security Considerations
- All large operations require multi-sig approval
- Private keys never leave the wallet service
- Audit trail for all blockchain operations
- Rate limiting and fraud detection

## Environment Variables
```
XRPL_NETWORK=testnet|mainnet
TREASURY_WALLET_SEED=sXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MULTISIG_THRESHOLD_USD=5000
BACKEND_WEBHOOK_URL=https://your-backend.com/wallet-webhook
API_SECRET_KEY=your-secret-key
```

## Database Schema (Wallet Service)
- wallet_operations (mint/burn operations)
- multisig_approvals (approval tracking)
- audit_logs (all operations)
- treasury_balances (treasury tracking)
