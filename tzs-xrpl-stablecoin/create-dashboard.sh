#!/bin/bash

# XRPL Stablecoin Dashboard Setup Script

echo "🚀 Creating XRPL Stablecoin Dashboard..."

# Create dashboard directory
mkdir -p dashboard
cd dashboard

# Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install additional dependencies
npm install @radix-ui/react-icons @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npm install recharts socket.io-client xrpl zustand
npm install -D @types/node

# Create basic directory structure
mkdir -p src/components/{ui,dashboard,forms,layout}
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/types

echo "✅ Dashboard project created!"
echo "📁 Location: ./dashboard"
echo "🔧 Next steps:"
echo "   1. cd dashboard"
echo "   2. npm run dev"
echo "   3. Open http://localhost:3000"
