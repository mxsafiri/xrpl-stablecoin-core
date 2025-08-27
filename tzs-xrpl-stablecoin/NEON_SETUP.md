# Neon Database Setup Guide

This guide walks you through connecting your TZS Stablecoin project to Neon PostgreSQL database.

## Prerequisites

- Neon account created at [neon.tech](https://neon.tech)
- Project repository connected to Neon
- Node.js and npm installed locally

## Configuration Files Updated

### 1. Knex Configuration (`knexfile.ts`)
- ✅ Updated to support `DATABASE_URL` connection strings
- ✅ Added SSL configuration for production
- ✅ Maintains fallback to individual DB parameters

### 2. Environment Variables (`.env.example`)
- ✅ Added `DATABASE_URL` for main database
- ✅ Added `TEST_DATABASE_URL` for test database
- ✅ Kept individual DB parameters as fallback

## Setup Steps

### 1. Get Your Neon Connection String

1. Go to your [Neon Dashboard](https://console.neon.tech)
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string (format: `postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)

### 2. Update Your Environment File

Create or update your `.env` file:

```bash
# Copy from .env.example
cp .env.example .env

# Edit .env and replace with your actual Neon connection string
DATABASE_URL=postgresql://your_username:your_password@ep-your-endpoint.region.aws.neon.tech/your_database?sslmode=require
```

### 3. Test Database Connection

```bash
# Test connection using the provided script
node test-neon-connection.js
```

### 4. Run Database Migrations

```bash
# Install dependencies
npm install

# Run migrations to create tables
npm run migrate

# Optional: Run seeds to populate initial data
npm run seed
```

## Database Schema

Your database includes these tables:

- **users**: Role-based user management (admin, treasury, user)
- **collateral_ledger**: Tracks TZS backing deposits/withdrawals
- **transactions**: XRPL transaction history (mint/burn/transfer)
- **multisig_operations**: Multisig approval tracking
- **audit_logs**: Security audit trail

## Database Service

Use the `DatabaseService` class for common operations:

```typescript
import DatabaseService from './src/services/database.service';

// Test connection
await DatabaseService.testConnection();

// Get health status
const health = await DatabaseService.getHealthStatus();

// Run migrations programmatically
await DatabaseService.runMigrations();
```

## Troubleshooting

### Connection Issues
- Verify your `DATABASE_URL` is correct
- Check that your Neon database is active
- Ensure SSL mode is set to `require`

### Migration Issues
- Make sure your database user has CREATE privileges
- Check that the database exists in your Neon project
- Verify your connection string includes the correct database name

### SSL/TLS Issues
- Neon requires SSL connections
- The connection string should include `?sslmode=require`
- Production environments automatically use SSL

## Environment-Specific Configuration

- **Development**: Uses `DATABASE_URL` or falls back to local PostgreSQL
- **Test**: Uses `TEST_DATABASE_URL` or creates test database
- **Production**: Requires `DATABASE_URL` with SSL enabled

## Security Notes

- Never commit your actual `.env` file
- Use environment variables in production
- Rotate database credentials regularly
- Monitor connection usage in Neon dashboard
