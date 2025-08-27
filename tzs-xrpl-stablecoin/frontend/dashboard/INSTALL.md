# TZS Dashboard Installation Guide

## Quick Setup

Run these commands in your terminal:

```bash
# Navigate to dashboard directory
cd /Users/victormuhagachi/CascadeProjects/tzs-xrpl-stablecoin/dashboard

# Install all dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Start development server
npm run dev
```

## What This Will Do

1. **Install Dependencies** - Downloads all required packages:
   - React 18 & Next.js 14
   - TypeScript definitions
   - Tailwind CSS
   - Lucide React icons
   - XRPL library
   - Axios for API calls

2. **Fix All TypeScript Errors** - All 400+ errors will disappear once modules are available

3. **Start Dashboard** - Available at http://localhost:3000

## Environment Setup

Update `.env.local` with your backend API:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
```

## Verify Installation

After `npm install`, check that errors are gone:
- Open MultisigPanel.tsx - should show no TypeScript errors
- All React/Next.js imports should resolve
- Dashboard ready to run with `npm run dev`

## Next Steps

1. Ensure your TZS backend API is running on port 3000
2. Test dashboard connectivity to backend
3. Verify token operations work through UI
4. Configure multisig approvals if needed

---

**Ready to manage your TZS stablecoin operations! 🚀**
