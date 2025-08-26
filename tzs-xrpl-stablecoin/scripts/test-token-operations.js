#!/usr/bin/env node

/**
 * XRPL Token Operations Test Script
 * Tests token issuance, minting, and basic operations
 */

const { Client, Wallet, xrpToDrops } = require('xrpl');

async function testTokenOperations() {
  console.log('🧪 Testing XRPL Token Operations...\n');

  const client = new Client('wss://s.altnet.rippletest.net:51233');
  
  try {
    await client.connect();
    console.log('✅ Connected to testnet\n');

    // You'll need to replace these with your actual wallet seeds from the setup script
    const ADMIN_SEED = process.env.XRPL_ADMIN_SEED || 'YOUR_ADMIN_SEED_HERE';
    const TREASURY_SEED = process.env.XRPL_TREASURY_SEED || 'YOUR_TREASURY_SEED_HERE';
    
    if (ADMIN_SEED === 'YOUR_ADMIN_SEED_HERE') {
      console.log('❌ Please run the setup script first and update your .env file');
      return;
    }

    const adminWallet = Wallet.fromSeed(ADMIN_SEED);
    const treasuryWallet = Wallet.fromSeed(TREASURY_SEED);
    
    console.log(`🔑 Admin Wallet: ${adminWallet.address}`);
    console.log(`🏦 Treasury Wallet: ${treasuryWallet.address}\n`);

    // Create a test user wallet
    console.log('👤 Creating test user wallet...');
    const userWallet = Wallet.generate();
    await client.fundWallet(userWallet);
    console.log(`✅ User wallet created: ${userWallet.address}\n`);

    // Step 1: Set up trust line from user to issuer
    console.log('🔗 Setting up trust line...');
    const trustlineTransaction = {
      TransactionType: 'TrustSet',
      Account: userWallet.address,
      LimitAmount: {
        currency: 'TZS',
        issuer: adminWallet.address,
        value: '1000000' // Trust limit
      }
    };

    const preparedTrustline = await client.autofill(trustlineTransaction);
    const signedTrustline = userWallet.sign(preparedTrustline);
    const trustlineResult = await client.submitAndWait(signedTrustline.tx_blob);
    
    if (trustlineResult.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log('✅ Trust line established successfully');
      console.log(`📋 Transaction hash: ${trustlineResult.result.hash}\n`);
    } else {
      console.log('❌ Trust line failed:', trustlineResult.result.meta.TransactionResult);
      return;
    }

    // Step 2: Issue tokens (mint)
    console.log('🏭 Minting TZS tokens...');
    const mintAmount = '1000';
    const mintTransaction = {
      TransactionType: 'Payment',
      Account: adminWallet.address,
      Destination: userWallet.address,
      Amount: {
        currency: 'TZS',
        issuer: adminWallet.address,
        value: mintAmount
      }
    };

    const preparedMint = await client.autofill(mintTransaction);
    const signedMint = adminWallet.sign(preparedMint);
    const mintResult = await client.submitAndWait(signedMint.tx_blob);
    
    if (mintResult.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log(`✅ Minted ${mintAmount} TZS tokens to user`);
      console.log(`📋 Transaction hash: ${mintResult.result.hash}\n`);
    } else {
      console.log('❌ Minting failed:', mintResult.result.meta.TransactionResult);
      return;
    }

    // Step 3: Check user balance
    console.log('💰 Checking user balance...');
    const accountLines = await client.request({
      command: 'account_lines',
      account: userWallet.address,
      ledger_index: 'validated'
    });

    const tzsBalance = accountLines.result.lines.find(line => 
      line.currency === 'TZS' && line.account === adminWallet.address
    );

    if (tzsBalance) {
      console.log(`✅ User TZS balance: ${tzsBalance.balance} TZS\n`);
    } else {
      console.log('❌ No TZS balance found\n');
    }

    // Step 4: Test token transfer
    console.log('🔄 Testing token transfer...');
    const recipient = Wallet.generate();
    await client.fundWallet(recipient);
    
    // Set up trust line for recipient
    const recipientTrustline = {
      TransactionType: 'TrustSet',
      Account: recipient.address,
      LimitAmount: {
        currency: 'TZS',
        issuer: adminWallet.address,
        value: '1000000'
      }
    };

    const preparedRecipientTrustline = await client.autofill(recipientTrustline);
    const signedRecipientTrustline = recipient.sign(preparedRecipientTrustline);
    await client.submitAndWait(signedRecipientTrustline.tx_blob);
    
    // Transfer tokens
    const transferAmount = '100';
    const transferTransaction = {
      TransactionType: 'Payment',
      Account: userWallet.address,
      Destination: recipient.address,
      Amount: {
        currency: 'TZS',
        issuer: adminWallet.address,
        value: transferAmount
      }
    };

    const preparedTransfer = await client.autofill(transferTransaction);
    const signedTransfer = userWallet.sign(preparedTransfer);
    const transferResult = await client.submitAndWait(signedTransfer.tx_blob);
    
    if (transferResult.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log(`✅ Transferred ${transferAmount} TZS tokens`);
      console.log(`📋 Transaction hash: ${transferResult.result.hash}\n`);
    }

    console.log('🎉 Token operations test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`• Issuer: ${adminWallet.address}`);
    console.log(`• Currency: TZS`);
    console.log(`• Minted: ${mintAmount} TZS`);
    console.log(`• Transferred: ${transferAmount} TZS`);
    console.log(`• View on explorer: https://testnet.xrpl.org/accounts/${adminWallet.address}`);

  } catch (error) {
    console.error('❌ Error during token operations test:', error);
  } finally {
    await client.disconnect();
  }
}

// Load environment variables if .env file exists
try {
  require('dotenv').config();
} catch (e) {
  console.log('💡 Tip: Install dotenv to load environment variables automatically');
}

testTokenOperations().catch(console.error);
