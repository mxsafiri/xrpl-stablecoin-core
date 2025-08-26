import axios from 'axios';
import { Wallet } from 'xrpl';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Example wallets (for demo purposes only)
const adminWallet = {
  address: process.env.DEMO_ADMIN_ADDRESS || 'rAdmin123',
  seed: process.env.DEMO_ADMIN_SEED || 'sAdmin123'
};

const treasuryWallet = {
  address: process.env.DEMO_TREASURY_ADDRESS || 'rTreasury123',
  seed: process.env.DEMO_TREASURY_SEED || 'sTreasury123'
};

const userWallet = {
  address: process.env.DEMO_USER_ADDRESS || 'rUser123',
  seed: process.env.DEMO_USER_SEED || 'sUser123'
};

// Helper function to authenticate
async function authenticate(wallet: { address: string; seed: string }) {
  try {
    // In a real implementation, this would sign a challenge with the wallet
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      wallet_address: wallet.address,
      signature: 'demo_signature' // In production, this would be a real signature
    });

    return response.data.token;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Demo function to mint tokens
async function mintTokens(amount: number, destinationWallet: string) {
  try {
    // Authenticate as admin
    const token = await authenticate(adminWallet);

    // Request mint operation
    const mintResponse = await axios.post(
      `${API_BASE_URL}/token/mint`,
      {
        amount,
        destination_wallet: destinationWallet,
        reference_id: `demo-mint-${Date.now()}`
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Mint request created:', mintResponse.data);

    // Approve the mint operation (in production, this would be done by multiple signers)
    const operationId = mintResponse.data.operation.id;
    const approveResponse = await axios.post(
      `${API_BASE_URL}/token/approve`,
      {
        operation_id: operationId,
        wallet_seed: adminWallet.seed
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Mint operation approved:', approveResponse.data);
    return approveResponse.data;
  } catch (error) {
    console.error('Mint operation failed:', error);
    throw error;
  }
}

// Demo function to transfer tokens
async function transferTokens(amount: number, sourceWallet: { address: string; seed: string }, destinationWallet: string) {
  try {
    // Authenticate as source wallet
    const token = await authenticate(sourceWallet);

    // Transfer tokens
    const transferResponse = await axios.post(
      `${API_BASE_URL}/token/transfer`,
      {
        amount,
        destination_wallet: destinationWallet,
        wallet_seed: sourceWallet.seed
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Transfer completed:', transferResponse.data);
    return transferResponse.data;
  } catch (error) {
    console.error('Transfer failed:', error);
    throw error;
  }
}

// Demo function to check balance
async function checkBalance(walletAddress: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/token/balance/${walletAddress}`);
    console.log(`Balance for ${walletAddress}:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Balance check failed:', error);
    throw error;
  }
}

// Demo function to process fiat deposit
async function processFiatDeposit(amount: number, bankAccountNumber: string, destinationWallet: string) {
  try {
    // Authenticate as treasury
    const token = await authenticate(treasuryWallet);

    // Process deposit
    const depositResponse = await axios.post(
      `${API_BASE_URL}/psp/deposit`,
      {
        amount,
        bankAccountNumber,
        destinationWallet,
        reference: `demo-deposit-${Date.now()}`
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Fiat deposit processed:', depositResponse.data);
    return depositResponse.data;
  } catch (error) {
    console.error('Fiat deposit failed:', error);
    throw error;
  }
}

// Run the demo
async function runDemo() {
  try {
    console.log('Starting TZS Stablecoin Demo');
    console.log('----------------------------');

    // Check initial balances
    console.log('\n1. Checking initial balances:');
    await checkBalance(adminWallet.address);
    await checkBalance(userWallet.address);

    // Mint tokens to user
    console.log('\n2. Minting 1000 TZS to user wallet:');
    await mintTokens(1000, userWallet.address);

    // Check balances after mint
    console.log('\n3. Checking balances after mint:');
    await checkBalance(adminWallet.address);
    await checkBalance(userWallet.address);

    // Transfer tokens between wallets
    console.log('\n4. Transferring 200 TZS from user to admin:');
    await transferTokens(200, userWallet, adminWallet.address);

    // Check balances after transfer
    console.log('\n5. Checking balances after transfer:');
    await checkBalance(adminWallet.address);
    await checkBalance(userWallet.address);

    // Process fiat deposit
    console.log('\n6. Processing fiat deposit of 500 TZS:');
    await processFiatDeposit(500, '123456789', userWallet.address);

    // Check final balances
    console.log('\n7. Checking final balances:');
    await checkBalance(adminWallet.address);
    await checkBalance(userWallet.address);

    console.log('\nDemo completed successfully!');
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo();
}

export {
  authenticate,
  mintTokens,
  transferTokens,
  checkBalance,
  processFiatDeposit
};
