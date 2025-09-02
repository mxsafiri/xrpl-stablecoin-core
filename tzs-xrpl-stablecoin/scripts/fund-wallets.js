const { Client, Wallet } = require('xrpl');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env.multisig' });

async function fundWallet(address) {
  try {
    console.log(`💰 Funding wallet: ${address}`);
    const response = await axios.post('https://faucet.altnet.rippletest.net/accounts', {
      destination: address,
      xrpAmount: 1000
    });
    
    if (response.data && response.data.account) {
      console.log(`   ✅ Successfully funded with ${response.data.account.balance} drops`);
      return true;
    } else {
      console.log(`   ❌ Funding failed: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Funding error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function fundAllWallets() {
  console.log('🚀 Funding Multi-Sig Wallets');
  console.log('============================');
  
  const wallets = [
    { name: 'Admin', seed: process.env.XRPL_ADMIN_SEED },
    { name: 'Treasury', seed: process.env.XRPL_TREASURY_SEED },
    { name: 'Signer 1', seed: process.env.XRPL_SIGNER_1_SEED },
    { name: 'Signer 2', seed: process.env.XRPL_SIGNER_2_SEED },
    { name: 'Signer 3', seed: process.env.XRPL_SIGNER_3_SEED }
  ];
  
  for (const walletInfo of wallets) {
    if (walletInfo.seed) {
      const wallet = Wallet.fromSeed(walletInfo.seed);
      console.log(`\n${walletInfo.name} Wallet: ${wallet.address}`);
      await fundWallet(wallet.address);
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n⏳ Waiting 10 seconds for transactions to settle...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check balances after funding
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  
  console.log('\n🔍 Verifying Wallet Balances');
  console.log('============================');
  
  for (const walletInfo of wallets) {
    if (walletInfo.seed) {
      const wallet = Wallet.fromSeed(walletInfo.seed);
      try {
        const balance = await client.getXrpBalance(wallet.address);
        console.log(`${walletInfo.name}: ${balance} XRP`);
      } catch (error) {
        console.log(`${walletInfo.name}: ❌ ${error.message}`);
      }
    }
  }
  
  await client.disconnect();
  console.log('\n✅ Wallet funding complete!');
}

fundAllWallets().catch(console.error);
