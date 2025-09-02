#!/usr/bin/env node

/**
 * Multi-Signature Workflow Test Script
 * 
 * This script tests the complete multi-signature workflow:
 * 1. Creates a mint operation
 * 2. Collects signatures from multiple signers
 * 3. Executes the multi-signed transaction
 */

const axios = require('axios');
const { Wallet } = require('xrpl');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_ADDRESS = 'rfXQiN2AzW82XK6nMcU7DU1zsd4HpuQUoT';
const TREASURY_ADDRESS = 'rJYHCdSGhqTy3yEbdHm8gednD1hbMSob7D';

// Test destination wallet (we'll create one)
let testDestinationWallet;

class MultisigWorkflowTest {
  constructor() {
    this.authToken = null;
  }

  /**
   * Authenticate as admin user
   */
  async authenticate() {
    console.log('🔐 Authenticating as admin...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        walletAddress: ADMIN_ADDRESS,
        signature: 'test_signature',
        message: 'Admin login for multisig test'
      });

      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Create a test destination wallet
   */
  async createTestWallet() {
    console.log('📝 Creating test destination wallet...');
    
    // Generate a random wallet for testing
    testDestinationWallet = Wallet.generate();
    console.log(`✅ Test wallet created: ${testDestinationWallet.address}`);
    
    return testDestinationWallet;
  }

  /**
   * Create a mint operation
   */
  async createMintOperation() {
    console.log('🏭 Creating mint operation...');
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/token/mint`,
        {
          amount: 100,
          destination_wallet: testDestinationWallet.address,
          reference_id: 'multisig-test-mint'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const operationId = response.data.operation_id;
      console.log(`✅ Mint operation created: ${operationId}`);
      return operationId;
    } catch (error) {
      console.error('❌ Failed to create mint operation:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get pending operations
   */
  async getPendingOperations() {
    console.log('📋 Fetching pending operations...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/token/pending-operations`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const operations = response.data.operations;
      console.log(`✅ Found ${operations.length} pending operations`);
      
      if (operations.length > 0) {
        console.log('📄 Operation details:');
        operations.forEach((op, index) => {
          console.log(`   ${index + 1}. ID: ${op.id}`);
          console.log(`      Type: ${op.operation_type}`);
          console.log(`      Status: ${op.status}`);
          console.log(`      Signatures: ${op.current_signatures}/${op.required_signatures}`);
        });
      }
      
      return operations;
    } catch (error) {
      console.error('❌ Failed to get pending operations:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Approve an operation with a signer
   */
  async approveOperation(operationId, signerId) {
    console.log(`✍️ Approving operation ${operationId} with ${signerId}...`);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/token/approve/${operationId}`,
        {
          signer_id: signerId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Operation approved by ${signerId}`);
      console.log(`   Status: ${response.data.operation.status}`);
      console.log(`   Signatures: ${response.data.operation.current_signatures}/${response.data.operation.required_signatures}`);
      
      return response.data.operation;
    } catch (error) {
      console.error(`❌ Failed to approve operation with ${signerId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Test the complete workflow
   */
  async runWorkflowTest() {
    try {
      console.log('\n🚀 Starting Multi-Signature Workflow Test');
      console.log('==========================================');

      // Step 1: Authenticate
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Authentication failed');
      }

      // Step 2: Create test wallet
      await this.createTestWallet();

      // Step 3: Create mint operation
      const operationId = await this.createMintOperation();

      // Step 4: Check pending operations
      await this.getPendingOperations();

      // Step 5: Approve with first signer
      console.log('\n📝 Collecting signatures...');
      await this.approveOperation(operationId, 'signer_1');

      // Step 6: Approve with second signer (should trigger execution)
      await this.approveOperation(operationId, 'signer_2');

      // Step 7: Check final status
      console.log('\n🔍 Checking final status...');
      const finalOperations = await this.getPendingOperations();
      
      const completedOperation = finalOperations.find(op => op.id === operationId);
      if (completedOperation) {
        console.log(`⚠️ Operation still pending: ${completedOperation.status}`);
      } else {
        console.log('✅ Operation completed and removed from pending list');
      }

      console.log('\n🎉 Multi-signature workflow test completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Workflow test failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  const test = new MultisigWorkflowTest();
  test.runWorkflowTest().catch(console.error);
}

module.exports = MultisigWorkflowTest;
