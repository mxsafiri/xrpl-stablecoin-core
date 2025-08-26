# XRPL Testnet Manual Setup Guide

## Step 1: Generate Testnet Wallets

Visit the XRP Faucet to generate funded testnet wallets:
**https://xrpl.org/resources/dev-tools/xrp-faucets**

### Generate 3 Wallets:

1. **Admin Wallet** (Token Issuer)
   - Click "Generate test account" on the faucet page
   - Save the Address and Secret (seed)
   - This will be your token issuer

2. **Treasury Wallet** 
   - Generate another test account
   - Save the Address and Secret (seed)
   - This will hold reserve funds

3. **Test User Wallet**
   - Generate a third test account
   - Save the Address and Secret (seed)
   - This will be used for testing token operations

## Step 2: Update Your .env File

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Then update these values in your `.env` file:

```env
# XRPL Configuration
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_ADMIN_SEED=s[YOUR_ADMIN_WALLET_SECRET]
XRPL_TREASURY_SEED=s[YOUR_TREASURY_WALLET_SECRET] 
XRPL_ISSUER_ADDRESS=r[YOUR_ADMIN_WALLET_ADDRESS]
XRPL_CURRENCY_CODE=TZS

# Security (generate a random JWT secret)
JWT_SECRET=your_random_jwt_secret_here_make_it_long_and_secure

# Database (if using local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tzs_stablecoin
DB_USER=postgres
DB_PASSWORD=postgres
```

## Step 3: Verify Your Setup

### Check Wallet Balances
Visit the testnet explorer to verify your wallets have XRP:
**https://testnet.xrpl.org/**

Enter your wallet addresses to see balances and transaction history.

### Alternative Faucet
If you need more test XRP, use:
**https://test.xrplexplorer.com/faucet**

## Step 4: Test Token Operations

Once your `.env` file is configured, you can test the token operations by running:

```bash
# Install dependencies first
npm install

# Run the token operations test
node scripts/test-token-operations.js
```

## Important Notes

- **Keep your seeds secure**: Never share testnet seeds publicly
- **Testnet resets**: Testnet data may be reset periodically
- **No real value**: Testnet XRP has no monetary value
- **Rate limits**: Faucets may have rate limits per IP address

## Wallet Format Examples

- **Address format**: `rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH`
- **Secret format**: `sn3nxiW7v8KXzPzAqzyHXbSSKNuN9`

## Next Steps

After completing this setup:
1. Your wallets will be funded with testnet XRP
2. Your environment will be configured for testing
3. You can start testing token issuance and minting
4. Use the testnet explorer to monitor transactions
