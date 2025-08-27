# TZS Stablecoin - XRPL-based Tanzanian Shilling Stablecoin

A Tanzanian Shilling (TZS) pegged stablecoin built on the XRP Ledger (XRPL) with comprehensive backend services and management dashboard.

## Project Structure

```
tzs-xrpl-stablecoin/
├── backend/                 # Backend API server
│   ├── src/                # Source code
│   │   ├── api/           # API routes and controllers
│   │   ├── config/        # Configuration files
│   │   ├── core/          # Core business logic
│   │   ├── db/            # Database migrations and seeds
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business services
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── package.json       # Backend dependencies
│   ├── tsconfig.json      # TypeScript configuration
│   └── knexfile.ts        # Database configuration
├── frontend/               # Frontend applications
│   └── dashboard/         # Management dashboard (Next.js)
│       ├── src/           # Dashboard source code
│       ├── package.json   # Frontend dependencies
│       └── next.config.js # Next.js configuration
├── package.json           # Workspace configuration
├── README.md              # This file
└── .env.example           # Environment variables template
```

## Features

- **XRPL Integration**: Native token operations on XRP Ledger
- **Multi-signature Security**: Configurable multi-sig approvals for operations
- **Collateral Management**: Real-time collateral tracking and management
- **RESTful API**: Comprehensive API for all token operations
- **Management Dashboard**: Web-based interface for operations management
- **Audit Logging**: Complete audit trail for all operations
- **Role-based Access**: Admin, Treasury, and User role management
- **Neon PostgreSQL**: Cloud database integration

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │   Backend API   │    │   XRPL Network  │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Testnet)     │
│  :3001          │    │   :3000         │    └─────────────────┘
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Neon PostgreSQL │
                       │   Database      │
                       └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Neon PostgreSQL database account
- XRPL testnet account with XRP

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mxsafiri/xrpl-stablecoin-core.git
cd tzs-xrpl-stablecoin
```

2. Install all dependencies:
```bash
npm run setup
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Neon database URL and XRPL credentials
```

4. Run database migrations:
```bash
npm run db:migrate
npm run db:seed
```

5. Start both backend and frontend:
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3000
- Frontend dashboard on http://localhost:3001

## Development Commands

### Workspace Commands (run from root)
```bash
npm run dev              # Start both backend and frontend
npm run dev:backend      # Start only backend
npm run dev:frontend     # Start only frontend
npm run build            # Build both applications
npm run test             # Run all tests
npm run setup            # Install all dependencies
```

### Database Commands
```bash
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with initial data
npm run db:reset         # Reset database
```

### Individual Application Commands

**Backend** (from `/backend` directory):
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm test                 # Run tests
```

**Frontend** (from `/frontend/dashboard` directory):
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm test                 # Run tests
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Wallet-based authentication
- `POST /api/auth/register` - Register new wallet

### Token Operations
- `POST /api/token/mint` - Mint new tokens
- `POST /api/token/burn` - Burn existing tokens
- `POST /api/token/transfer` - Transfer tokens
- `GET /api/token/balance/:wallet` - Get wallet balance
- `GET /api/token/transactions` - Get transaction history

### Multi-signature Operations
- `GET /api/token/pending-operations` - Get pending operations
- `POST /api/token/approve/:id` - Approve operation
- `POST /api/token/reject/:id` - Reject operation

### Collateral Management
- `GET /api/token/collateral` - Get collateral status
- `POST /api/token/collateral/add` - Add collateral
- `POST /api/token/collateral/remove` - Remove collateral

## Configuration

Key environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Neon Database
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# XRPL
XRPL_SERVER=wss://s.altnet.rippletest.net:51233
XRPL_ADMIN_SEED=your_admin_seed
XRPL_TREASURY_SEED=your_treasury_seed

# Security
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h
```

## Dashboard Features

- **Real-time Operations**: Live multisig operations management
- **Transaction Monitoring**: Complete transaction history and filtering
- **Authentication**: JWT-based admin authentication
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error states and loading indicators

## Security

- Multi-signature requirements for sensitive operations
- JWT-based authentication with role-based access control
- Comprehensive audit logging
- Input validation and sanitization
- SSL/TLS encryption for database connections
- Environment-based configuration management

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team.
