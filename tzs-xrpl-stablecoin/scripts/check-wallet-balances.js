const { Client, Wallet } = require('xrpl');
require('dotenv').config({ path: './backend/.env.multisig' });

async function checkWalletBalances() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  
  try {
    console.log('🔍 Checking Multi-Sig Wallet Balances');
    console.log('=====================================');
    
    await client.connect();
    
    // Admin wallet
    const adminWallet = Wallet.fromSeed(process.env.XRPL_ADMIN_SEED);
    console.log(`\n📊 Admin Wallet: ${adminWallet.address}`);
    
    try {
      const adminBalance = await client.getXrpBalance(adminWallet.address);
      console.log(`   Balance: ${adminBalance} XRP`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Treasury wallet
    const treasuryWallet = Wallet.fromSeed(process.env.XRPL_TREASURY_SEED);
    console.log(`\n📊 Treasury Wallet: ${treasuryWallet.address}`);
    
    try {
      const treasuryBalance = await client.getXrpBalance(treasuryWallet.address);
      console.log(`   Balance: ${treasuryBalance} XRP`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Signer wallets
    for (let i = 1; i <= 3; i++) {
      const signerSeed = process.env[`XRPL_SIGNER_${i}_SEED`];
      if (signerSeed) {
        const signerWallet = Wallet.fromSeed(signerSeed);
        console.log(`\n📊 Signer ${i} Wallet: ${signerWallet.address}`);
        
        try {
          const signerBalance = await client.getXrpBalance(signerWallet.address);
          console.log(`   Balance: ${signerBalance} XRP`);
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n💡 Note: Wallets need at least 10 XRP reserve + transaction fees');
    console.log('💡 Use XRPL Testnet Faucet: https://xrpl.org/xrp-testnet-faucet.html');
    
  } catch (error) {
    console.error('❌ Failed to check balances:', error);
  } finally {
    await client.disconnect();
  }
}

checkWalletBalances().catch(console.error);
