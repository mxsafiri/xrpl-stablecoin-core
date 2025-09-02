#!/usr/bin/env node

/**
 * XRPL Multi-Signature Setup Script
 * 
 * This script sets up proper XRPL multi-signature configuration for the TZS stablecoin project.
 * It creates signer wallets and configures SignerListSet transactions.
 */

const { Client, Wallet, xrpToDrops } = require('xrpl');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK_URL = 'wss://s.devnet.rippletest.net:51233'; // Devnet server
const MULTISIG_QUORUM = 2; // Require 2 signatures
const SIGNER_WEIGHTS = [1, 1, 1]; // Each signer has weight 1

class MultisigSetup {
  constructor() {
    this.client = new Client(NETWORK_URL, {
      connectionTimeout: 20000, // 20 second timeout
      requestTimeout: 10000
    });
    this.signerWallets = [];
    this.adminWallet = null;
    this.treasuryWallet = null;
  }

  async connect() {
    console.log('🔗 Connecting to XRPL testnet...');
    await this.client.connect();
    console.log('✅ Connected to XRPL testnet');
  }

  async disconnect() {
    await this.client.disconnect();
    console.log('🔌 Disconnected from XRPL');
  }

  /**
   * Create and fund signer wallets
   */
  async createSignerWallets() {
    console.log('\n📝 Creating signer wallets...');
    
    for (let i = 0; i < 3; i++) {
      console.log(`Creating signer wallet ${i + 1}...`);
      
      // Generate new wallet
      const wallet = Wallet.generate();
      
      // Fund wallet on testnet
      const fundResult = await this.client.fundWallet(wallet);
      
      this.signerWallets.push({
        id: `signer_${i + 1}`,
        wallet: wallet,
        address: wallet.address,
        seed: wallet.seed,
        weight: SIGNER_WEIGHTS[i],
        balance: fundResult.balance
      });

      console.log(`✅ Signer ${i + 1}: ${wallet.address} (Balance: ${fundResult.balance} XRP)`);
    }
  }

  /**
   * Create admin and treasury wallets if they don't exist
   */
  async createMainWallets() {
    console.log('\n🏛️ Setting up main wallets...');

    // Create admin wallet
    this.adminWallet = Wallet.generate();
    const adminFund = await this.client.fundWallet(this.adminWallet);
    console.log(`✅ Admin wallet: ${this.adminWallet.address} (Balance: ${adminFund.balance} XRP)`);

    // Create treasury wallet  
    this.treasuryWallet = Wallet.generate();
    const treasuryFund = await this.client.fundWallet(this.treasuryWallet);
    console.log(`✅ Treasury wallet: ${this.treasuryWallet.address} (Balance: ${treasuryFund.balance} XRP)`);
  }

  /**
   * Set up multi-signature configuration on admin wallet
   */
  async setupAdminMultisig() {
    console.log('\n🔐 Setting up multi-signature on admin wallet...');

    const signerEntries = this.signerWallets.map(signer => ({
      SignerEntry: {
        Account: signer.address,
        SignerWeight: signer.weight
      }
    }));

    const signerListTx = {
      TransactionType: 'SignerListSet',
      Account: this.adminWallet.address,
      SignerQuorum: MULTISIG_QUORUM,
      SignerEntries: signerEntries
    };

    try {
      const prepared = await this.client.autofill(signerListTx);
      const signed = this.adminWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log('✅ Multi-signature setup successful on admin wallet');
        console.log(`📋 Transaction hash: ${result.result.hash}`);
        return result.result.hash;
      } else {
        throw new Error(`Setup failed: ${result.result.meta.TransactionResult}`);
      }
    } catch (error) {
      console.error('❌ Failed to setup multi-signature:', error.message);
      throw error;
    }
  }

  /**
   * Set up multi-signature configuration on treasury wallet
   */
  async setupTreasuryMultisig() {
    console.log('\n🏦 Setting up multi-signature on treasury wallet...');

    const signerEntries = this.signerWallets.map(signer => ({
      SignerEntry: {
        Account: signer.address,
        SignerWeight: signer.weight
      }
    }));

    const signerListTx = {
      TransactionType: 'SignerListSet',
      Account: this.treasuryWallet.address,
      SignerQuorum: MULTISIG_QUORUM,
      SignerEntries: signerEntries
    };

    try {
      const prepared = await this.client.autofill(signerListTx);
      const signed = this.treasuryWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log('✅ Multi-signature setup successful on treasury wallet');
        console.log(`📋 Transaction hash: ${result.result.hash}`);
        return result.result.hash;
      } else {
        throw new Error(`Setup failed: ${result.result.meta.TransactionResult}`);
      }
    } catch (error) {
      console.error('❌ Failed to setup multi-signature:', error.message);
      throw error;
    }
  }

  /**
   * Disable master key on wallets (optional security step)
   */
  async disableMasterKeys() {
    console.log('\n🔒 Disabling master keys for enhanced security...');

    // Disable admin wallet master key
    const adminDisableTx = {
      TransactionType: 'AccountSet',
      Account: this.adminWallet.address,
      SetFlag: 4 // asfDisableMaster
    };

    try {
      const prepared = await this.client.autofill(adminDisableTx);
      const signed = this.adminWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);
      
      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log('✅ Admin wallet master key disabled');
      }
    } catch (error) {
      console.log('⚠️ Warning: Could not disable admin master key:', error.message);
    }

    // Disable treasury wallet master key
    const treasuryDisableTx = {
      TransactionType: 'AccountSet',
      Account: this.treasuryWallet.address,
      SetFlag: 4 // asfDisableMaster
    };

    try {
      const prepared = await this.client.autofill(treasuryDisableTx);
      const signed = this.treasuryWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);
      
      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log('✅ Treasury wallet master key disabled');
      }
    } catch (error) {
      console.log('⚠️ Warning: Could not disable treasury master key:', error.message);
    }
  }

  /**
   * Save configuration to files
   */
  async saveConfiguration() {
    console.log('\n💾 Saving configuration...');

    const config = {
      network: NETWORK_URL,
      multisigQuorum: MULTISIG_QUORUM,
      adminWallet: {
        address: this.adminWallet.address,
        seed: this.adminWallet.seed
      },
      treasuryWallet: {
        address: this.treasuryWallet.address,
        seed: this.treasuryWallet.seed
      },
      signerWallets: this.signerWallets.map(signer => ({
        id: signer.id,
        address: signer.address,
        seed: signer.seed,
        weight: signer.weight
      })),
      setupDate: new Date().toISOString()
    };

    // Save to JSON file
    const configPath = path.join(__dirname, '..', 'multisig-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Configuration saved to: ${configPath}`);

    // Create .env file content
    const envContent = `# Multi-signature Configuration - Generated ${new Date().toISOString()}
XRPL_NETWORK=testnet
XRPL_ADMIN_SEED=${this.adminWallet.seed}
XRPL_TREASURY_SEED=${this.treasuryWallet.seed}
XRPL_ISSUER_ADDRESS=${this.adminWallet.address}
XRPL_CURRENCY_CODE=TZS

# Signer Wallets
XRPL_SIGNER_1_SEED=${this.signerWallets[0].seed}
XRPL_SIGNER_2_SEED=${this.signerWallets[1].seed}
XRPL_SIGNER_3_SEED=${this.signerWallets[2].seed}

# Multi-sig Settings
MULTISIG_QUORUM=${MULTISIG_QUORUM}
MULTISIG_SIGNERS=3
`;

    const envPath = path.join(__dirname, '..', 'backend', '.env.multisig');
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Environment file saved to: ${envPath}`);
  }

  /**
   * Verify multi-signature setup
   */
  async verifySetup() {
    console.log('\n🔍 Verifying multi-signature setup...');

    try {
      // Check admin wallet signer list
      const adminSignerList = await this.client.request({
        command: 'account_objects',
        account: this.adminWallet.address,
        type: 'signer_list'
      });

      if (adminSignerList.result.account_objects.length > 0) {
        console.log('✅ Admin wallet multi-signature verified');
        const signerList = adminSignerList.result.account_objects[0];
        console.log(`   Quorum: ${signerList.SignerQuorum}`);
        console.log(`   Signers: ${signerList.SignerEntries.length}`);
      }

      // Check treasury wallet signer list
      const treasurySignerList = await this.client.request({
        command: 'account_objects',
        account: this.treasuryWallet.address,
        type: 'signer_list'
      });

      if (treasurySignerList.result.account_objects.length > 0) {
        console.log('✅ Treasury wallet multi-signature verified');
        const signerList = treasurySignerList.result.account_objects[0];
        console.log(`   Quorum: ${signerList.SignerQuorum}`);
        console.log(`   Signers: ${signerList.SignerEntries.length}`);
      }

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  /**
   * Run the complete setup process
   */
  async run() {
    try {
      await this.connect();
      
      console.log('\n🚀 Starting XRPL Multi-Signature Setup');
      console.log('=====================================');
      
      await this.createSignerWallets();
      await this.createMainWallets();
      await this.setupAdminMultisig();
      await this.setupTreasuryMultisig();
      
      // Optional: Disable master keys for enhanced security
      // await this.disableMasterKeys();
      
      await this.saveConfiguration();
      await this.verifySetup();
      
      console.log('\n🎉 Multi-signature setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Copy the generated .env.multisig to backend/.env');
      console.log('2. Update your application configuration');
      console.log('3. Test the multi-signature functionality');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new MultisigSetup();
  setup.run().catch(console.error);
}

module.exports = MultisigSetup;
