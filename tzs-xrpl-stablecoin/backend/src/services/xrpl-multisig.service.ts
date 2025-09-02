import { Client, Wallet, xrpToDrops } from 'xrpl';
import config from '../config';
import { TransactionResult } from '../types';
import logger from '../utils/logger';
import db from '../db/connection';

interface PendingTransaction {
  id: string;
  transaction: any;
  signatures: Array<{
    signer: string;
    signature: string;
    signingPubKey: string;
  }>;
  requiredSignatures: number;
  currentSignatures: number;
}

class XrplMultisigService {
  private client: Client;
  private signerWallets: Map<string, Wallet> = new Map();
  private pendingTransactions: Map<string, PendingTransaction> = new Map();

  constructor() {
    // Initialize XRPL client based on network configuration
    let serverUrl: string;
    switch (config.xrplNetwork) {
      case 'testnet':
        serverUrl = 'wss://s.devnet.rippletest.net:51233'; // Use devnet which worked in setup
        break;
      case 'devnet':
        serverUrl = 'wss://s.devnet.rippletest.net:51233';
        break;
      case 'mainnet':
        serverUrl = 'wss://xrplcluster.com';
        break;
      default:
        serverUrl = 'wss://s.devnet.rippletest.net:51233';
    }

    this.client = new Client(serverUrl);
  }

  /**
   * Connect to XRPL and initialize signer wallets
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info(`Connected to XRPL ${config.xrplNetwork} for multi-sig operations`);

      // Initialize signer wallets from environment variables
      await this.initializeSignerWallets();
    } catch (error) {
      logger.error('Failed to connect to XRPL for multi-sig', error);
      throw new Error('Failed to connect to XRPL for multi-sig');
    }
  }

  /**
   * Initialize signer wallets from environment variables
   */
  private async initializeSignerWallets(): Promise<void> {
    try {
      // Load signer wallets from environment
      const signerSeeds = [
        process.env.XRPL_SIGNER_1_SEED,
        process.env.XRPL_SIGNER_2_SEED,
        process.env.XRPL_SIGNER_3_SEED,
      ].filter(Boolean);

      for (let i = 0; i < signerSeeds.length; i++) {
        const seed = signerSeeds[i];
        if (seed) {
          const wallet = Wallet.fromSeed(seed);
          this.signerWallets.set(`signer_${i + 1}`, wallet);
          logger.info(`Initialized signer wallet ${i + 1}: ${wallet.address}`);
        }
      }

      logger.info(`Initialized ${this.signerWallets.size} signer wallets`);
    } catch (error) {
      logger.error('Failed to initialize signer wallets', error);
      throw error;
    }
  }

  /**
   * Create a multi-signature transaction for token minting
   */
  async createMintTransaction(
    amount: number,
    destinationAddress: string,
    issuerAddress: string
  ): Promise<{ transactionId: string; transaction: any }> {
    try {
      const transactionId = `mint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the payment transaction for minting
      const paymentTx = {
        TransactionType: 'Payment',
        Account: issuerAddress,
        Destination: destinationAddress,
        Amount: {
          currency: config.currencyCode,
          value: amount.toString(),
          issuer: issuerAddress,
        },
      };

      // Prepare the transaction (autofill sequence, fee, etc.)
      const prepared = await this.client.autofill(paymentTx);
      
      // Adjust fee for multi-signature: (N+1) * base fee where N = number of signers
      const baseFee = parseInt(prepared.Fee);
      const multisigFee = baseFee * (config.multisigQuorum + 1);
      prepared.Fee = multisigFee.toString();

      // Store as pending transaction
      this.pendingTransactions.set(transactionId, {
        id: transactionId,
        transaction: prepared,
        signatures: [],
        requiredSignatures: config.multisigQuorum,
        currentSignatures: 0,
      });

      logger.info(`Created multi-sig mint transaction: ${transactionId}`);
      return { transactionId, transaction: prepared };
    } catch (error) {
      logger.error('Failed to create mint transaction', error);
      throw new Error(`Failed to create mint transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a multi-signature transaction for token burning
   */
  async createBurnTransaction(
    amount: number,
    sourceAddress: string,
    issuerAddress: string
  ): Promise<{ transactionId: string; transaction: any }> {
    try {
      const transactionId = `burn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the payment transaction for burning (send to issuer)
      const paymentTx = {
        TransactionType: 'Payment',
        Account: sourceAddress,
        Destination: issuerAddress,
        Amount: {
          currency: config.currencyCode,
          value: amount.toString(),
          issuer: issuerAddress,
        },
      };

      // Prepare the transaction
      const prepared = await this.client.autofill(paymentTx);
      
      // Adjust fee for multi-signature: (N+1) * base fee where N = number of signers
      const baseFee = parseInt(prepared.Fee);
      const multisigFee = baseFee * (config.multisigQuorum + 1);
      prepared.Fee = multisigFee.toString();

      // Store as pending transaction
      this.pendingTransactions.set(transactionId, {
        id: transactionId,
        transaction: prepared,
        signatures: [],
        requiredSignatures: config.multisigQuorum,
        currentSignatures: 0,
      });

      logger.info(`Created multi-sig burn transaction: ${transactionId}`);
      return { transactionId, transaction: prepared };
    } catch (error) {
      logger.error('Failed to create burn transaction', error);
      throw new Error(`Failed to create burn transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sign a transaction with a specific signer wallet
   */
  async signTransaction(
    transactionId: string,
    signerId: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const pendingTx = this.pendingTransactions.get(transactionId);
      if (!pendingTx) {
        return { success: false, error: 'Transaction not found' };
      }

      const signerWallet = this.signerWallets.get(signerId);
      if (!signerWallet) {
        return { success: false, error: 'Signer wallet not found' };
      }

      // Check if this signer has already signed
      const existingSignature = pendingTx.signatures.find(sig => sig.signer === signerId);
      if (existingSignature) {
        return { success: false, error: 'Signer has already signed this transaction' };
      }

      // Use sign_for method to get proper multi-signature format
      const signForResponse = await this.client.request({
        command: 'sign_for',
        account: this.signerWallets.get(signerId)?.address,
        secret: this.signerWallets.get(signerId)?.seed,
        tx_json: pendingTx.transaction
      });
      
      // Extract the signature from the sign_for response
      const signerData = signForResponse.result.tx_json.Signers[0].Signer;
      const signature = signerData.TxnSignature;
      const signingPubKey = signerData.SigningPubKey;

      // Add signature to pending transaction
      pendingTx.signatures.push({
        signer: signerId,
        signature: signature,
        signingPubKey: signingPubKey,
      });
      pendingTx.currentSignatures++;

      logger.info(`Transaction ${transactionId} signed by ${signerId} (${pendingTx.currentSignatures}/${pendingTx.requiredSignatures})`);

      return { success: true, signature };
    } catch (error) {
      logger.error(`Failed to sign transaction ${transactionId}`, error);
      return { 
        success: false, 
        error: `Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Submit a multi-signed transaction when enough signatures are collected
   */
  async submitMultisignedTransaction(transactionId: string): Promise<TransactionResult> {
    try {
      const pendingTx = this.pendingTransactions.get(transactionId);
      if (!pendingTx) {
        return { success: false, error: 'Transaction not found' };
      }

      if (pendingTx.currentSignatures < pendingTx.requiredSignatures) {
        return { 
          success: false, 
          error: `Insufficient signatures: ${pendingTx.currentSignatures}/${pendingTx.requiredSignatures}` 
        };
      }

      // Prepare multi-signed transaction
      const multisignedTx = {
        ...pendingTx.transaction,
        SigningPubKey: '', // Required empty string for multi-signed transactions
        Signers: pendingTx.signatures.map(sig => ({
          Signer: {
            Account: this.signerWallets.get(sig.signer)?.address,
            SigningPubKey: sig.signingPubKey,
            TxnSignature: sig.signature,
          },
        })),
      };

      logger.info(`Submitting multi-signed transaction ${transactionId}:`, {
        signatures: pendingTx.currentSignatures,
        required: pendingTx.requiredSignatures,
        signers: multisignedTx.Signers.map(s => s.Signer.Account),
        transactionType: multisignedTx.TransactionType,
      });

      // Submit the multi-signed transaction using submit_multisigned
      const result = await this.client.request({
        command: 'submit_multisigned',
        tx_json: multisignedTx
      });

      if (result.result.engine_result === 'tesSUCCESS') {
        // Remove from pending transactions
        this.pendingTransactions.delete(transactionId);
        
        logger.info(`Multi-signed transaction ${transactionId} submitted successfully: ${result.result.tx_json.hash}`);
        return {
          success: true,
          hash: result.result.tx_json.hash,
          result: result.result,
        };
      } else {
        logger.error(`Multi-signed transaction ${transactionId} failed: ${result.result.engine_result}`);
        return {
          success: false,
          error: `Transaction failed: ${result.result.engine_result}`,
          result: result.result,
        };
      }
    } catch (error) {
      logger.error(`Failed to submit multi-signed transaction ${transactionId}`, error);
      return {
        success: false,
        error: `Failed to submit transaction: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get pending transaction details
   */
  getPendingTransaction(transactionId: string): PendingTransaction | null {
    return this.pendingTransactions.get(transactionId) || null;
  }

  /**
   * Get all pending transactions
   */
  getAllPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * Get available signer wallets
   */
  getAvailableSigners(): Array<{ id: string; address: string }> {
    return Array.from(this.signerWallets.entries()).map(([id, wallet]) => ({
      id,
      address: wallet.address,
    }));
  }

  /**
   * Check if a transaction has enough signatures
   */
  hasEnoughSignatures(transactionId: string): boolean {
    const pendingTx = this.pendingTransactions.get(transactionId);
    if (!pendingTx) return false;
    return pendingTx.currentSignatures >= pendingTx.requiredSignatures;
  }

  /**
   * Cancel a pending transaction
   */
  cancelTransaction(transactionId: string): boolean {
    const deleted = this.pendingTransactions.delete(transactionId);
    if (deleted) {
      logger.info(`Cancelled pending transaction: ${transactionId}`);
    }
    return deleted;
  }

  /**
   * Disconnect from XRPL
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
    logger.info('Disconnected from XRPL multi-sig service');
  }
}

export default new XrplMultisigService();
