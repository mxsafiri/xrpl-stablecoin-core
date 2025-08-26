# TZS Stablecoin Dashboard

A modern React/Next.js dashboard for managing XRPL stablecoin operations.

## Features

- **🎯 Token Operations** - Mint, burn, and transfer TZS tokens
- **💼 Wallet Management** - Monitor balances and transaction history
- **👥 Multisig Approvals** - Review and approve pending operations
- **📊 Real-time Monitoring** - Live transaction tracking from XRPL
- **📈 Analytics** - Token supply, circulation, and usage metrics

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Running TZS stablecoin backend API

### Installation

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Update .env.local with your API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_XRPL_NETWORK=wss://s.altnet.rippletest.net:51233

# Start development server
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## Dashboard Sections

### 1. Overview
- Token supply and circulation stats
- Active wallet count and 24h transactions
- Quick action buttons
- Recent transaction feed

### 2. Token Operations
- **Mint**: Create new TZS tokens to specified wallet
- **Burn**: Destroy tokens from specified wallet  
- **Transfer**: Move tokens between wallets
- Operation history and status tracking

### 3. Wallet Management
- Admin and treasury wallet overview
- Balance monitoring
- Address management with copy functionality
- QR code generation for addresses

### 4. Transaction Monitor
- Real-time XRPL transaction feed
- Filter by operation type (mint/burn/transfer)
- Transaction hash, amounts, and status
- Live updates from XRPL network

### 5. Multisig Panel
- Pending operations requiring approval
- Signature progress tracking
- Approve/reject functionality
- Multi-admin workflow management

## API Integration

The dashboard connects to your TZS stablecoin backend API:

```typescript
// Token operations
POST /api/psp/mint
POST /api/psp/burn
POST /api/tokens/transfer

// Wallet operations  
GET /api/wallets/{address}/balance
GET /api/wallets/{address}/transactions

// Multisig operations
GET /api/multisig/pending
POST /api/multisig/{id}/approve
POST /api/multisig/{id}/reject
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Lucide React icons
- **XRPL**: xrpl.js library for blockchain integration
- **State**: Zustand for state management
- **HTTP**: Axios for API calls

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_XRPL_NETWORK=wss://s.altnet.rippletest.net:51233

# Optional
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## Security Notes

- Dashboard connects to XRPL testnet by default
- All sensitive operations require backend API authentication
- Multisig approvals provide additional security layer
- Wallet seeds are never exposed in frontend

## Support

For issues or questions:
1. Check backend API is running on correct port
2. Verify XRPL network connectivity
3. Ensure environment variables are configured
4. Review browser console for errors

---

**Ready to manage your TZS stablecoin operations!** 🚀
