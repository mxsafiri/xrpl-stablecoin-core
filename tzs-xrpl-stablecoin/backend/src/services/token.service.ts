import xrplService from './xrpl.service';
import multisigService from './multisig.service';
import logger from '../utils/logger';
import { TransactionResult } from '../types';

interface MintRequest {
  id: string;
  amount: number;
  destinationWallet: string;
  reference: string;
  pspHash?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

interface BurnRequest {
  id: string;
  amount: number;
  sourceWallet: string;
  reference: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

class TokenService {
  private mintRequests: Map<string, MintRequest> = new Map();
  private burnRequests: Map<string, BurnRequest> = new Map();

  /**
   * Request a token mint operation (requires multisig approval)
   */
  async requestMint(
    amount: number,
    destinationWallet: string,
    reference: string,
    pspHash?: string
  ): Promise<{ success: boolean; result?: MintRequest; error?: string }> {
    try {
      const mintRequest: MintRequest = {
        id: `mint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount,
        destinationWallet,
        reference,
        pspHash,
        status: 'pending',
        createdAt: new Date(),
      };

      this.mintRequests.set(mintRequest.id, mintRequest);

      // Create multisig operation for the mint operation
      const operation = await multisigService.createOperation(
        'mint',
        {
          amount,
          destination_wallet: destinationWallet,
          reference,
          requestId: mintRequest.id,
        }
      );

      if (!operation) {
        return {
          success: false,
          error: 'Failed to create multisig operation',
        };
      }

      logger.info(`Mint request created: ${mintRequest.id} for ${amount} TZS to ${destinationWallet}`);

      return {
        success: true,
        result: mintRequest,
      };
    } catch (error) {
      logger.error('Failed to request mint', error);
      return {
        success: false,
        error: `Failed to request mint: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Request a token burn operation (requires multisig approval)
   */
  async requestBurn(
    amount: number,
    sourceWallet: string,
    reference: string
  ): Promise<{ success: boolean; result?: BurnRequest; error?: string }> {
    try {
      const burnRequest: BurnRequest = {
        id: `burn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount,
        sourceWallet,
        reference,
        status: 'pending',
        createdAt: new Date(),
      };

      this.burnRequests.set(burnRequest.id, burnRequest);

      // Create multisig operation for the burn operation
      const operation = await multisigService.createOperation(
        'burn',
        {
          amount,
          source_wallet: sourceWallet,
          reference,
          requestId: burnRequest.id,
        }
      );

      if (!operation) {
        return {
          success: false,
          error: 'Failed to create multisig operation',
        };
      }

      logger.info(`Burn request created: ${burnRequest.id} for ${amount} TZS from ${sourceWallet}`);

      return {
        success: true,
        result: burnRequest,
      };
    } catch (error) {
      logger.error('Failed to request burn', error);
      return {
        success: false,
        error: `Failed to request burn: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Execute an approved mint operation
   */
  async executeMint(requestId: string): Promise<TransactionResult> {
    try {
      const mintRequest = this.mintRequests.get(requestId);
      if (!mintRequest) {
        return {
          success: false,
          error: `Mint request ${requestId} not found`,
        };
      }

      if (mintRequest.status !== 'approved') {
        return {
          success: false,
          error: `Mint request ${requestId} is not approved (status: ${mintRequest.status})`,
        };
      }

      // Execute the mint operation via XRPL service
      const result = await xrplService.mintTokens(
        mintRequest.amount,
        mintRequest.destinationWallet
      );

      if (result.success) {
        mintRequest.status = 'completed';
        mintRequest.completedAt = new Date();
        this.mintRequests.set(requestId, mintRequest);

        logger.info(`Mint operation completed: ${requestId}`);
      } else {
        logger.error(`Mint operation failed: ${requestId} - ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to execute mint', error);
      return {
        success: false,
        error: `Failed to execute mint: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Execute an approved burn operation
   */
  async executeBurn(requestId: string, sourceWalletSeed: string): Promise<TransactionResult> {
    try {
      const burnRequest = this.burnRequests.get(requestId);
      if (!burnRequest) {
        return {
          success: false,
          error: `Burn request ${requestId} not found`,
        };
      }

      if (burnRequest.status !== 'approved') {
        return {
          success: false,
          error: `Burn request ${requestId} is not approved (status: ${burnRequest.status})`,
        };
      }

      // Create wallet from seed to execute burn
      const { Wallet } = await import('xrpl');
      const sourceWallet = Wallet.fromSeed(sourceWalletSeed);

      if (sourceWallet.address !== burnRequest.sourceWallet) {
        return {
          success: false,
          error: 'Provided wallet seed does not match the source wallet address',
        };
      }

      // Execute the burn operation via XRPL service
      const result = await xrplService.burnTokens(burnRequest.amount, sourceWallet);

      if (result.success) {
        burnRequest.status = 'completed';
        burnRequest.completedAt = new Date();
        this.burnRequests.set(requestId, burnRequest);

        logger.info(`Burn operation completed: ${requestId}`);
      } else {
        logger.error(`Burn operation failed: ${requestId} - ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to execute burn', error);
      return {
        success: false,
        error: `Failed to execute burn: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Approve a mint request (called by multisig service)
   */
  async approveMint(requestId: string): Promise<boolean> {
    try {
      const mintRequest = this.mintRequests.get(requestId);
      if (!mintRequest) {
        logger.error(`Mint request ${requestId} not found`);
        return false;
      }

      mintRequest.status = 'approved';
      mintRequest.approvedAt = new Date();
      this.mintRequests.set(requestId, mintRequest);

      logger.info(`Mint request approved: ${requestId}`);
      return true;
    } catch (error) {
      logger.error('Failed to approve mint request', error);
      return false;
    }
  }

  /**
   * Approve a burn request (called by multisig service)
   */
  async approveBurn(requestId: string): Promise<boolean> {
    try {
      const burnRequest = this.burnRequests.get(requestId);
      if (!burnRequest) {
        logger.error(`Burn request ${requestId} not found`);
        return false;
      }

      burnRequest.status = 'approved';
      burnRequest.approvedAt = new Date();
      this.burnRequests.set(requestId, burnRequest);

      logger.info(`Burn request approved: ${requestId}`);
      return true;
    } catch (error) {
      logger.error('Failed to approve burn request', error);
      return false;
    }
  }

  /**
   * Reject a mint request
   */
  async rejectMint(requestId: string): Promise<boolean> {
    try {
      const mintRequest = this.mintRequests.get(requestId);
      if (!mintRequest) {
        logger.error(`Mint request ${requestId} not found`);
        return false;
      }

      mintRequest.status = 'rejected';
      this.mintRequests.set(requestId, mintRequest);

      logger.info(`Mint request rejected: ${requestId}`);
      return true;
    } catch (error) {
      logger.error('Failed to reject mint request', error);
      return false;
    }
  }

  /**
   * Reject a burn request
   */
  async rejectBurn(requestId: string): Promise<boolean> {
    try {
      const burnRequest = this.burnRequests.get(requestId);
      if (!burnRequest) {
        logger.error(`Burn request ${requestId} not found`);
        return false;
      }

      burnRequest.status = 'rejected';
      this.burnRequests.set(requestId, burnRequest);

      logger.info(`Burn request rejected: ${requestId}`);
      return true;
    } catch (error) {
      logger.error('Failed to reject burn request', error);
      return false;
    }
  }

  /**
   * Get mint request by ID
   */
  getMintRequest(requestId: string): MintRequest | undefined {
    return this.mintRequests.get(requestId);
  }

  /**
   * Get burn request by ID
   */
  getBurnRequest(requestId: string): BurnRequest | undefined {
    return this.burnRequests.get(requestId);
  }

  /**
   * Get all mint requests
   */
  getAllMintRequests(): MintRequest[] {
    return Array.from(this.mintRequests.values());
  }

  /**
   * Get all burn requests
   */
  getAllBurnRequests(): BurnRequest[] {
    return Array.from(this.burnRequests.values());
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address: string): Promise<number> {
    return await xrplService.getTzsBalance(address);
  }

  /**
   * Setup trust line for TZS token
   */
  async setupTrustline(walletSeed: string, limit?: string): Promise<TransactionResult> {
    try {
      const { Wallet } = await import('xrpl');
      const wallet = Wallet.fromSeed(walletSeed);
      return await xrplService.setupTrustline(wallet, limit);
    } catch (error) {
      logger.error('Failed to setup trustline', error);
      return {
        success: false,
        error: `Failed to setup trustline: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

export default new TokenService();
