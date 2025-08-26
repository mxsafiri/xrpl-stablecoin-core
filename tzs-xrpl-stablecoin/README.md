# TZS Stablecoin on XRP Ledger

A production-ready backend system for a Tanzanian Shilling (TZS) pegged stablecoin on the XRP Ledger (XRPL).

## Features

- **XRPL-issued TZS stablecoin**: Fully compliant with XRPL token standards
- **Multisig Security**: XRPL-native multisig support for admin/treasury operations
- **Role-based Access Control**: Admin, treasury, and user roles
- **Collateral Tracking**: Reserve ledger to track TZS backing each token
- **Comprehensive API**: REST endpoints for all stablecoin operations
- **Audit Logging**: Complete history of all operations

## Technology Stack

- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL
- **Blockchain**: XRP Ledger
- **API**: Express.js
- **Authentication**: JWT + XRPL signatures

## Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- XRPL account with funding (for testnet/mainnet)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tzs-xrpl-stablecoin.git
   cd tzs-xrpl-stablecoin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run migrate
   npm run seed
   ```

5. Start the server:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new wallet
- `POST /api/auth/login` - Login with wallet signature

### Token Operations

- `POST /api/token/mint` - Mint new tokens (requires multisig approval)
- `POST /api/token/burn` - Burn tokens (requires multisig approval)
- `POST /api/token/transfer` - Transfer tokens between wallets
- `POST /api/token/approve` - Approve a multisig operation
- `GET /api/token/balance/:wallet` - Get token balance for a wallet
- `GET /api/token/transactions` - Get transaction history
- `GET /api/token/collateral` - Get collateral balance
- `GET /api/token/pending-operations` - Get pending operations

## XRPL Setup

### Creating Issuer Account

1. Generate a new XRPL wallet for the issuer:
   ```javascript
   const wallet = xrpl.Wallet.generate();
   console.log(wallet.address); // Issuer address
   console.log(wallet.seed);    // Issuer seed (KEEP SECURE!)
   ```

2. Fund the wallet on testnet:
   ```javascript
   // Using the XRPL Testnet Faucet
   // https://xrpl.org/xrp-testnet-faucet.html
   ```

3. Configure the issuer account in `.env`:
   ```
   XRPL_ISSUER_ADDRESS=r...
   XRPL_ADMIN_SEED=s...
   ```

### Setting Up Multisig

1. Generate signer wallets:
   ```javascript
   const signer1 = xrpl.Wallet.generate();
   const signer2 = xrpl.Wallet.generate();
   const signer3 = xrpl.Wallet.generate();
   ```

2. Configure multisig in the admin account:
   ```javascript
   // See multisig.service.ts for implementation details
   ```

## Testing

Run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Example Usage

### Minting TZS Tokens

```javascript
// Request a mint operation (requires multisig approval)
const mintRequest = {
  amount: 1000,
  destination_wallet: "rDestinationAddress",
  reference_id: "bank-deposit-123",
  bank_transaction_id: "bank-tx-456"
};

// Admin or treasury initiates the request
await fetch('/api/token/mint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify(mintRequest)
});

// Required signers approve the operation
await fetch('/api/token/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    operation_id: "operation-id-from-mint-request",
    wallet_seed: "sSignerSeed"
  })
});
```

### Transferring TZS Tokens

```javascript
// Transfer tokens between wallets
const transferRequest = {
  amount: 100,
  destination_wallet: "rDestinationAddress",
  wallet_seed: "sSourceWalletSeed"
};

await fetch('/api/token/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify(transferRequest)
});
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
