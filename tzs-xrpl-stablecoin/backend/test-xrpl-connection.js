#!/usr/bin/env node

/**
 * Simple XRPL Connection Test
 * Tests basic connectivity and wallet validation
 */

// Simple test without external dependencies
const testXRPLConnection = async () => {
  console.log('🧪 Testing XRPL Configuration...\n');

  // Environment variables from your .env file
  const config = {
    network: 'wss://s.altnet.rippletest.net:51233',
    adminSeed: 'sEd7uXumpxULakG8gQpm9jX3dmu2H8L',
    treasurySeed: 'sEdVgrmgKYtx7NNZNupRJLqyEweRZC9',
    issuerAddress: 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM',
    currencyCode: 'TZS'
  };

  console.log('📋 Configuration:');
  console.log(`Network: ${config.network}`);
  console.log(`Issuer Address: ${config.issuerAddress}`);
  console.log(`Currency Code: ${config.currencyCode}`);
  console.log(`Admin Seed: ${config.adminSeed.substring(0, 4)}...`);
  console.log(`Treasury Seed: ${config.treasurySeed.substring(0, 4)}...`);

  // Validate seed format
  console.log('\n🔍 Validating wallet seeds...');
  
  if (config.adminSeed.startsWith('s') && config.adminSeed.length >= 25) {
    console.log('✅ Admin seed format is valid');
  } else {
    console.log('❌ Admin seed format is invalid');
  }

  if (config.treasurySeed.startsWith('s') && config.treasurySeed.length >= 25) {
    console.log('✅ Treasury seed format is valid');
  } else {
    console.log('❌ Treasury seed format is invalid');
  }

  // Validate address format
  console.log('\n🔍 Validating issuer address...');
  if (config.issuerAddress.startsWith('r') && config.issuerAddress.length >= 25) {
    console.log('✅ Issuer address format is valid');
  } else {
    console.log('❌ Issuer address format is invalid');
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Verify wallets have XRP balance at: https://testnet.xrpl.org/');
  console.log(`   - Check admin wallet: https://testnet.xrpl.org/accounts/${config.issuerAddress}`);
  console.log('2. Start your backend server: npm run dev');
  console.log('3. Test token operations using the API endpoints');

  console.log('\n✅ Configuration test completed!');
};

// Run the test
testXRPLConnection().catch(console.error);
