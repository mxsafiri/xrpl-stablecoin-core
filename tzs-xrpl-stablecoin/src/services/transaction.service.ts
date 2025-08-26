import { Wallet } from 'xrpl';
import db from '../db/connection';
import { Transaction, MintRequest, BurnRequest, TransferRequest } from '../types';
import xrplService from './xrpl.service';
import multisigService from './multisig.service';
import auditService from './audit.service';
import logger from '../utils/logger';

class TransactionService {
  /**
   * Request a mint operation (requires multisig approval)
   * @param mintRequest Mint request data
   * @param requesterWallet Wallet address of the requester
   * @param requesterRole Role of the requester
   */
  async requestMint(
    mintRequest: MintRequest,
    requesterWallet: string,
    requesterRole: 'admin' | 'treasury' | 'user' | 'system'
  ): Promise<string> {
    try {
      // Create a multisig operation for minting
      const operation = await multisigService.createOperation('mint', {
        amount: mintRequest.amount,
        destination_wallet: mintRequest.destination_wallet,
        reference_id: mintRequest.reference_id,
        bank_transaction_id: mintRequest.bank_transaction_id,
      });

      // Log the mint request
      await auditService.logAction(
        'mint_requested',
        requesterWallet,
        requesterRole,
        {
          operation_id: operation.id,
          amount: mintRequest.amount,
          destination_wallet: mintRequest.destination_wallet,
          reference_id: mintRequest.reference_id,
        }
      );

      logger.info(`Mint request created: ${operation.id}`);
      return operation.id;
    } catch (error) {
      logger.error('Failed to request mint', error);
      throw new Error('Failed to request mint');
    }
  }

  /**
   * Request a burn operation (requires multisig approval)
   * @param burnRequest Burn request data
   * @param requesterWallet Wallet address of the requester
   * @param requesterRole Role of the requester
   */
  async requestBurn(
    burnRequest: BurnRequest,
    requesterWallet: string,
    requesterRole: 'admin' | 'treasury' | 'user' | 'system'
  ): Promise<string> {
    try {
      // Create a multisig operation for burning
      const operation = await multisigService.createOperation('burn', {
        amount: burnRequest.amount,
        source_wallet: burnRequest.source_wallet,
        reference_id: burnRequest.reference_id,
      });

      // Log the burn request
      await auditService.logAction(
        'burn_requested',
        requesterWallet,
        requesterRole,
        {
          operation_id: operation.id,
          amount: burnRequest.amount,
          source_wallet: burnRequest.source_wallet,
          reference_id: burnRequest.reference_id,
        }
      );

      logger.info(`Burn request created: ${operation.id}`);
      return operation.id;
    } catch (error) {
      logger.error('Failed to request burn', error);
      throw new Error('Failed to request burn');
    }
  }

  /**
   * Execute a transfer of tokens between wallets
   * @param transferRequest Transfer request data
   * @param sourceWallet Source wallet with private key
   */
  async executeTransfer(
    transferRequest: TransferRequest,
    sourceWallet: Wallet
  ): Promise<Transaction> {
    try {
      // Execute the transfer on XRPL
      const result = await xrplService.transferTokens(
        transferRequest.amount,
        sourceWallet,
        transferRequest.destination_wallet
      );

      if (!result.success || !result.hash) {
        throw new Error(`Transfer failed: ${result.error}`);
      }

      // Record the transaction in the database
      const [transaction] = await db('transactions')
        .insert({
          xrpl_transaction_hash: result.hash,
          type: 'transfer',
          from_wallet: sourceWallet.address,
          to_wallet: transferRequest.destination_wallet,
          amount: transferRequest.amount,
          metadata: result.result,
        })
        .returning('*');

      // Log the transfer
      await auditService.logAction(
        'transfer_executed',
        sourceWallet.address,
        'user', // Assuming transfers are initiated by users
        {
          transaction_id: transaction.id,
          amount: transferRequest.amount,
          destination_wallet: transferRequest.destination_wallet,
          xrpl_transaction_hash: result.hash,
        }
      );

      logger.info(`Transfer executed: ${result.hash}`);
      return transaction;
    } catch (error) {
      logger.error('Failed to execute transfer', error);
      throw new Error('Failed to execute transfer');
    }
  }

  /**
   * Record a completed mint transaction
   * @param xrplTransactionHash XRPL transaction hash
   * @param amount Amount minted
   * @param fromWallet Issuer wallet
   * @param toWallet Destination wallet
   * @param collateralId ID of the collateral entry
   */
  async recordMintTransaction(
    xrplTransactionHash: string,
    amount: number,
    fromWallet: string,
    toWallet: string,
    collateralId: string
  ): Promise<Transaction> {
    try {
      const [transaction] = await db('transactions')
        .insert({
          xrpl_transaction_hash: xrplTransactionHash,
          type: 'mint',
          from_wallet: fromWallet,
          to_wallet: toWallet,
          amount,
          collateral_id: collateralId,
        })
        .returning('*');

      logger.info(`Mint transaction recorded: ${xrplTransactionHash}`);
      return transaction;
    } catch (error) {
      logger.error('Failed to record mint transaction', error);
      throw new Error('Failed to record mint transaction');
    }
  }

  /**
   * Record a completed burn transaction
   * @param xrplTransactionHash XRPL transaction hash
   * @param amount Amount burned
   * @param fromWallet Source wallet
   * @param toWallet Issuer wallet
   * @param collateralId ID of the collateral entry
   */
  async recordBurnTransaction(
    xrplTransactionHash: string,
    amount: number,
    fromWallet: string,
    toWallet: string,
    collateralId: string
  ): Promise<Transaction> {
    try {
      const [transaction] = await db('transactions')
        .insert({
          xrpl_transaction_hash: xrplTransactionHash,
          type: 'burn',
          from_wallet: fromWallet,
          to_wallet: toWallet,
          amount,
          collateral_id: collateralId,
        })
        .returning('*');

      logger.info(`Burn transaction recorded: ${xrplTransactionHash}`);
      return transaction;
    } catch (error) {
      logger.error('Failed to record burn transaction', error);
      throw new Error('Failed to record burn transaction');
    }
  }

  /**
   * Get transaction history with optional filtering
   * @param filters Optional filters for the transactions
   * @param page Page number for pagination
   * @param limit Number of items per page
   */
  async getTransactionHistory(
    filters: Partial<{
      type: 'mint' | 'burn' | 'transfer';
      fromWallet: string;
      toWallet: string;
      fromDate: Date;
      toDate: Date;
    }> = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const query = db('transactions');

      // Apply filters
      if (filters.type) {
        query.where('type', filters.type);
      }
      if (filters.fromWallet) {
        query.where('from_wallet', filters.fromWallet);
      }
      if (filters.toWallet) {
        query.where('to_wallet', filters.toWallet);
      }
      if (filters.fromDate) {
        query.where('created_at', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        query.where('created_at', '<=', filters.toDate);
      }

      // Get total count
      const [{ count }] = await query.clone().count('* as count');
      const total = parseInt(count as string, 10);

      // Get paginated results
      const offset = (page - 1) * limit;
      const transactions = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return { transactions, total };
    } catch (error) {
      logger.error('Failed to get transaction history', error);
      throw new Error('Failed to get transaction history');
    }
  }

  /**
   * Get a transaction by ID
   * @param transactionId Transaction ID
   */
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const transaction = await db('transactions')
        .where({ id: transactionId })
        .first();

      return transaction || null;
    } catch (error) {
      logger.error(`Failed to get transaction ${transactionId}`, error);
      throw new Error(`Failed to get transaction ${transactionId}`);
    }
  }

  /**
   * Get a transaction by XRPL hash
   * @param xrplHash XRPL transaction hash
   */
  async getTransactionByXrplHash(xrplHash: string): Promise<Transaction | null> {
    try {
      const transaction = await db('transactions')
        .where({ xrpl_transaction_hash: xrplHash })
        .first();

      return transaction || null;
    } catch (error) {
      logger.error(`Failed to get transaction by hash ${xrplHash}`, error);
      throw new Error(`Failed to get transaction by hash ${xrplHash}`);
    }
  }
}

export default new TransactionService();
