#!/usr/bin/env node

/**
 * XRPL Testnet Setup Script
 * Generates testnet wallets and helps configure environment variables
 */

const { Client, Wallet } = require('xrpl');

async function setupTestnetWallets() {
  console.log('🚀 Setting up XRPL Testnet wallets...\n');

  const client = new Client('wss://s.altnet.rippletest.net:51233');
  
  try {
    console.log('📡 Connecting to XRPL Testnet...');
    await client.connect();
    console.log('✅ Connected to testnet\n');

    // Generate Admin Wallet
    console.log('🔑 Generating Admin wallet...');
    const adminWallet = Wallet.generate();
    console.log(`Admin Address: ${adminWallet.address}`);
    console.log(`Admin Seed: ${adminWallet.seed}`);
    
    // Fund Admin Wallet
    console.log('💰 Funding Admin wallet...');
    const adminFundResult = await client.fundWallet(adminWallet);
    console.log(`✅ Admin wallet funded with ${adminFundResult.balance} XRP\n`);

    // Generate Treasury Wallet
    console.log('🔑 Generating Treasury wallet...');
    const treasuryWallet = Wallet.generate();
    console.log(`Treasury Address: ${treasuryWallet.address}`);
    console.log(`Treasury Seed: ${treasuryWallet.seed}`);
    
    // Fund Treasury Wallet
    console.log('💰 Funding Treasury wallet...');
    const treasuryFundResult = await client.fundWallet(treasuryWallet);
    console.log(`✅ Treasury wallet funded with ${treasuryFundResult.balance} XRP\n`);

    // Generate additional test wallets
    console.log('🔑 Generating additional test wallets...');
    const testWallet1 = Wallet.generate();
    const testWallet2 = Wallet.generate();
    
    console.log(`Test Wallet 1 Address: ${testWallet1.address}`);
    console.log(`Test Wallet 1 Seed: ${testWallet1.seed}`);
    
    console.log(`Test Wallet 2 Address: ${testWallet2.address}`);
    console.log(`Test Wallet 2 Seed: ${testWallet2.seed}\n`);

    // Fund test wallets
    await client.fundWallet(testWallet1);
    await client.fundWallet(testWallet2);
    console.log('✅ Test wallets funded\n');

    // Generate environment configuration
    console.log('📝 Environment Configuration:');
    console.log('=' .repeat(50));
    console.log(`XRPL_NETWORK=wss://s.altnet.rippletest.net:51233`);
    console.log(`XRPL_ADMIN_SEED=${adminWallet.seed}`);
    console.log(`XRPL_TREASURY_SEED=${treasuryWallet.seed}`);
    console.log(`XRPL_ISSUER_ADDRESS=${adminWallet.address}`);
    console.log(`XRPL_CURRENCY_CODE=TZS`);
    console.log('=' .repeat(50));
    console.log('\n📋 Copy the above values to your .env file');
    
    console.log('\n🔗 Additional Resources:');
    console.log('• Testnet Explorer: https://testnet.xrpl.org/');
    console.log('• XRP Faucet: https://xrpl.org/resources/dev-tools/xrp-faucets');
    console.log('• Alternative Faucet: https://test.xrplexplorer.com/faucet');

  } catch (error) {
    console.error('❌ Error setting up testnet wallets:', error);
  } finally {
    await client.disconnect();
    console.log('\n📡 Disconnected from testnet');
  }
}

// Run the setup
setupTestnetWallets().catch(console.error);
