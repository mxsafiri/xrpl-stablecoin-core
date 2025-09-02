import { Client, Wallet, SignerListSet } from 'xrpl';
import config from '../config';
import { TransactionResult, MultisigOperation } from '../types';
import xrplService from './xrpl.service';
import xrplMultisigService from './xrpl-multisig.service';
import db from '../db/connection';
import logger from '../utils/logger';

class MultisigService {
  /**
   * Set up a multisig signer list for an account
   * @param account The account to set up multisig for
   * @param signers Array of signer objects with address and weight
   * @param quorum The minimum weight required for a transaction
   */
  async setupMultisig(
    account: Wallet,
    signers: Array<{ address: string; weight: number }>,
    quorum: number
  ): Promise<TransactionResult> {
    try {
      // Create a SignerListSet transaction
      const signerListTx: SignerListSet = {
        TransactionType: 'SignerListSet',
        Account: account.address,
        SignerQuorum: quorum,
        SignerEntries: signers.map((signer) => ({
          SignerEntry: {
            Account: signer.address,
            SignerWeight: signer.weight,
          },
        })),
      };

            // Use xrplService directly instead of accessing its private client property
      const prepared = await xrplService.prepareTransaction(signerListTx);
      const signed = account.sign(prepared);
      const result = await xrplService.submitTransaction(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        logger.info(`Multisig setup successful for ${account.address}`);
        return {
          success: true,
          hash: result.result.hash,
          result: result.result,
        };
      } else {
        logger.error(`Failed to set up multisig: ${result.result.meta.TransactionResult}`);
        return {
          success: false,
          error: `Failed to set up multisig: ${result.result.meta.TransactionResult}`,
          result: result.result,
        };
      }
    } catch (error) {
      logger.error('Failed to set up multisig', error);
      return {
        success: false,
        error: `Failed to set up multisig: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create a new multisig operation in the database
   * @param operationType Type of operation (mint, burn, config_change)
   * @param operationData Data for the operation
   * @param requiredSignatures Number of signatures required
   */
  async createOperation(
    operationType: 'mint' | 'burn' | 'config_change',
    operationData: Record<string, any>,
    requiredSignatures: number = config.multisigQuorum
  ): Promise<MultisigOperation> {
    try {
      // Connect to XRPL multi-sig service if not connected
      await xrplMultisigService.connect();

      let xrplTransactionId: string;
      let xrplTransaction: any;

      // Create the corresponding XRPL transaction
      switch (operationType) {
        case 'mint':
          const mintResult = await xrplMultisigService.createMintTransaction(
            operationData.amount,
            operationData.destination_wallet,
            config.issuerAddress
          );
          xrplTransactionId = mintResult.transactionId;
          xrplTransaction = mintResult.transaction;
          break;

        case 'burn':
          const burnResult = await xrplMultisigService.createBurnTransaction(
            operationData.amount,
            operationData.source_wallet,
            config.issuerAddress
          );
          xrplTransactionId = burnResult.transactionId;
          xrplTransaction = burnResult.transaction;
          break;

        case 'config_change':
          throw new Error('Config change operations not yet implemented');

        default:
          throw new Error(`Unknown operation type: ${operationType}`);
      }

      // Store in database with XRPL transaction reference
      const [operation] = await db('multisig_operations')
        .insert({
          operation_type: operationType,
          operation_data: {
            ...operationData,
            xrpl_transaction_id: xrplTransactionId,
            xrpl_transaction: xrplTransaction,
          },
          required_signatures: requiredSignatures,
          current_signatures: 0,
          status: 'pending',
          signers: JSON.stringify([]),
        })
        .returning('*');

      logger.info(`Created multisig operation: ${operation.id} with XRPL transaction: ${xrplTransactionId}`);
      return operation;
    } catch (error) {
      logger.error('Failed to create multisig operation', error);
      throw new Error('Failed to create multisig operation');
    }
  }

  /**
   * Get a multisig operation by ID
   * @param operationId Operation ID
   */
  async getOperation(operationId: string): Promise<MultisigOperation | null> {
    try {
      const operation = await db('multisig_operations')
        .where({ id: operationId })
        .first();

      return operation || null;
    } catch (error) {
      logger.error(`Failed to get multisig operation ${operationId}`, error);
      throw new Error(`Failed to get multisig operation ${operationId}`);
    }
  }

  /**
   * Get all pending multisig operations
   */
  async getPendingOperations(): Promise<MultisigOperation[]> {
    try {
      const operations = await db('multisig_operations')
        .where({ status: 'pending' })
        .orderBy('created_at', 'desc');

      return operations;
    } catch (error) {
      logger.error('Failed to get pending multisig operations', error);
      throw new Error('Failed to get pending multisig operations');
    }
  }

  /**
   * Approve a multisig operation
   * @param operationId Operation ID
   * @param signerId Signer ID (e.g., 'signer_1', 'signer_2')
   */
  async approveOperation(
    operationId: string,
    signerId: string
  ): Promise<MultisigOperation> {
    try {
      // Get the operation
      const operation = await this.getOperation(operationId);
      if (!operation) {
        throw new Error(`Operation ${operationId} not found`);
      }

      if (operation.status !== 'pending') {
        throw new Error(`Operation ${operationId} is not pending`);
      }

      // Check if the signer has already signed
      let signers: string[] = [];
      if (Array.isArray(operation.signers)) {
        // If signers is already an array (PostgreSQL JSON field)
        signers = operation.signers;
      } else if (typeof operation.signers === 'string') {
        // If signers is a string, parse it
        try {
          signers = operation.signers && operation.signers !== '' ? JSON.parse(operation.signers) : [];
        } catch (error) {
          logger.warn(`Failed to parse signers data for operation ${operationId}, defaulting to empty array`);
          signers = [];
        }
      } else {
        // Default to empty array
        signers = [];
      }
      if (signers.includes(signerId)) {
        throw new Error(`Signer ${signerId} has already approved this operation`);
      }

      // Get XRPL transaction ID from operation data
      const operationData = operation.operation_data;
      const xrplTransactionId = operationData.xrpl_transaction_id;

      if (!xrplTransactionId) {
        throw new Error('XRPL transaction ID not found in operation data');
      }

      // Sign the XRPL transaction
      const signResult = await xrplMultisigService.signTransaction(xrplTransactionId, signerId);
      if (!signResult.success) {
        throw new Error(`Failed to sign XRPL transaction: ${signResult.error}`);
      }

      // Update the operation with the new signature
      const updatedSigners = [...signers, signerId];
      const currentSignatures = updatedSigners.length;
      let status: 'pending' | 'approved' | 'rejected' | 'executed' = operation.status;

      // Check if we have enough signatures
      if (currentSignatures >= operation.required_signatures) {
        status = 'approved';
      }

      const [updatedOperation] = await db('multisig_operations')
        .where({ id: operationId })
        .update({
          signers: JSON.stringify(updatedSigners),
          current_signatures: currentSignatures,
          status,
        })
        .returning('*');

      logger.info(`Operation ${operationId} approved by ${signerId} (${currentSignatures}/${operation.required_signatures})`);

      // If the operation is now approved, execute it
      if (updatedOperation.status === 'approved') {
        await this.executeOperation(updatedOperation);
      }

      return updatedOperation;
    } catch (error) {
      logger.error(`Failed to approve operation ${operationId}`, error);
      throw new Error(`Failed to approve operation ${operationId}`);
    }
  }

  /**
   * Execute an approved multisig operation
   * @param operation The approved operation to execute
   */
  async executeOperation(operation: MultisigOperation): Promise<void> {
    try {
      if (operation.status !== 'approved') {
        throw new Error(`Operation ${operation.id} is not approved`);
      }

      const operationData = operation.operation_data;
      const xrplTransactionId = operationData.xrpl_transaction_id;

      if (!xrplTransactionId) {
        throw new Error('XRPL transaction ID not found in operation data');
      }

      // Check if the XRPL transaction has enough signatures
      if (!xrplMultisigService.hasEnoughSignatures(xrplTransactionId)) {
        throw new Error('XRPL transaction does not have enough signatures');
      }

      // Submit the multi-signed transaction to XRPL
      const result = await xrplMultisigService.submitMultisignedTransaction(xrplTransactionId);

      if (result.success) {
        // Update the operation status to executed
        await db('multisig_operations')
          .where({ id: operation.id })
          .update({
            status: 'executed',
            xrpl_transaction_hash: result.hash,
          });

        logger.info(`Operation ${operation.id} executed successfully with XRPL hash: ${result.hash}`);
      } else {
        // Update the operation status to rejected if execution failed
        await db('multisig_operations')
          .where({ id: operation.id })
          .update({
            status: 'rejected',
          });

        logger.error(`Operation ${operation.id} execution failed: ${result.error}`);
        throw new Error(`Operation execution failed: ${result.error}`);
      }
    } catch (error) {
      logger.error(`Failed to execute operation ${operation.id}`, error);
      throw new Error(`Failed to execute operation ${operation.id}`);
    }
  }

  /**
   * Reject a multisig operation
   * @param operationId Operation ID
   */
  async rejectOperation(operationId: string): Promise<MultisigOperation> {
    try {
      const [operation] = await db('multisig_operations')
        .where({ id: operationId })
        .update({
          status: 'rejected',
        })
        .returning('*');

      logger.info(`Operation ${operationId} rejected`);
      return operation;
    } catch (error) {
      logger.error(`Failed to reject operation ${operationId}`, error);
      throw new Error(`Failed to reject operation ${operationId}`);
    }
  }
}

export default new MultisigService();
