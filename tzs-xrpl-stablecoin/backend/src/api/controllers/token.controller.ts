// Define Request and Response types directly
interface Request {
  body: any;
  params: any;
  query: any;
  user?: {
    walletAddress: string;
    role: string;
  };
  ip: string;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}
import { Wallet } from 'xrpl';
import xrplService from '../../services/xrpl.service';
import transactionService from '../../services/transaction.service';
import collateralService from '../../services/collateral.service';
import multisigService from '../../services/multisig.service';
import auditService from '../../services/audit.service';
import logger from '../../utils/logger';

class TokenController {
  /**
   * Request to mint new tokens (requires multisig approval)
   * @param req Request
   * @param res Response
   */
  async requestMint(req: Request, res: Response): Promise<void> {
    try {
      const { amount, destination_wallet, reference_id, bank_transaction_id } = req.body;

      if (!amount || !destination_wallet || !reference_id) {
        res.status(400).json({ error: 'Amount, destination wallet, and reference ID are required' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Create a mint request
      const operationId = await transactionService.requestMint(
        {
          amount: parseFloat(amount),
          destination_wallet,
          reference_id,
          bank_transaction_id,
        },
        req.user.walletAddress,
        req.user.role as any
      );

      // Record the collateral deposit
      await collateralService.recordDeposit(
        parseFloat(amount),
        reference_id,
        bank_transaction_id
      );

      res.status(201).json({
        message: 'Mint request created successfully',
        operation_id: operationId,
      });
    } catch (error) {
      logger.error('Mint request error', error);
      res.status(500).json({ error: 'Failed to create mint request' });
    }
  }

  /**
   * Request to burn tokens (requires multisig approval)
   * @param req Request
   * @param res Response
   */
  async requestBurn(req: Request, res: Response): Promise<void> {
    try {
      const { amount, source_wallet, reference_id } = req.body;

      if (!amount || !source_wallet || !reference_id) {
        res.status(400).json({ error: 'Amount, source wallet, and reference ID are required' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Create a burn request
      const operationId = await transactionService.requestBurn(
        {
          amount: parseFloat(amount),
          source_wallet,
          reference_id,
        },
        req.user.walletAddress,
        req.user.role as any
      );

      res.status(201).json({
        message: 'Burn request created successfully',
        operation_id: operationId,
      });
    } catch (error) {
      logger.error('Burn request error', error);
      res.status(500).json({ error: 'Failed to create burn request' });
    }
  }

  /**
   * Approve a multisig operation (legacy endpoint - kept for compatibility)
   * @param req Request
   * @param res Response
   */
  async approveOperationLegacy(req: Request, res: Response): Promise<void> {
    try {
      const { operation_id, signer_id } = req.body;

      if (!operation_id || !signer_id) {
        res.status(400).json({ error: 'Operation ID and signer ID are required' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Approve the operation with signer ID
      const operation = await multisigService.approveOperation(operation_id, signer_id);

      // Log the approval
      await auditService.logAction(
        'operation_approved',
        req.user.walletAddress,
        req.user.role as any,
        { operation_id },
        req.ip
      );

      res.status(200).json({
        message: 'Operation approved successfully',
        operation: {
          id: operation.id,
          type: operation.operation_type,
          status: operation.status,
          current_signatures: operation.current_signatures,
          required_signatures: operation.required_signatures,
        },
      });
    } catch (error) {
      logger.error('Operation approval error', error);
      res.status(500).json({ error: 'Failed to approve operation' });
    }
  }

  /**
   * Transfer tokens between wallets
   * @param req Request
   * @param res Response
   */
  async transferTokens(req: Request, res: Response): Promise<void> {
    try {
      const { amount, destination_wallet, wallet_seed } = req.body;

      if (!amount || !destination_wallet || !wallet_seed) {
        res.status(400).json({ error: 'Amount, destination wallet, and wallet seed are required' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Create a wallet from the seed
      const sourceWallet = Wallet.fromSeed(wallet_seed);

      // Verify that the wallet address matches the authenticated user
      if (sourceWallet.address !== req.user.walletAddress) {
        res.status(403).json({ error: 'Wallet address does not match authenticated user' });
        return;
      }

      // Execute the transfer
      const transaction = await transactionService.executeTransfer(
        {
          amount: parseFloat(amount),
          source_wallet: sourceWallet.address,
          destination_wallet,
        },
        sourceWallet
      );

      res.status(200).json({
        message: 'Transfer executed successfully',
        transaction: {
          id: transaction.id,
          xrpl_transaction_hash: transaction.xrpl_transaction_hash,
          amount: transaction.amount,
          from_wallet: transaction.from_wallet,
          to_wallet: transaction.to_wallet,
        },
      });
    } catch (error) {
      logger.error('Transfer error', error);
      res.status(500).json({ error: 'Failed to execute transfer' });
    }
  }

  /**
   * Get token balance for a wallet
   * @param req Request
   * @param res Response
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { wallet } = req.params;

      if (!wallet) {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      // Get the token balance
      const balance = await xrplService.getTzsBalance(wallet);

      res.status(200).json({
        wallet,
        balance,
      });
    } catch (error) {
      logger.error('Balance check error', error);
      res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  /**
   * Get transaction history
   * @param req Request
   * @param res Response
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { type, from_wallet, to_wallet, page, limit } = req.query;

      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      // Get transaction history
      const { transactions, total } = await transactionService.getTransactionHistory(
        {
          type: type as any,
          fromWallet: from_wallet as string,
          toWallet: to_wallet as string,
        },
        pageNum,
        limitNum
      );

      res.status(200).json({
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Transaction history error', error);
      res.status(500).json({ error: 'Failed to get transaction history' });
    }
  }

  /**
   * Get collateral balance
   * @param req Request
   * @param res Response
   */
  async getCollateralBalance(req: Request, res: Response): Promise<void> {
    try {
      // Get the collateral balance
      const balance = await collateralService.getCollateralBalance();

      res.status(200).json({
        balance,
      });
    } catch (error) {
      logger.error('Collateral balance error', error);
      res.status(500).json({ error: 'Failed to get collateral balance' });
    }
  }

  /**
   * Get pending operations
   * @param req Request
   * @param res Response
   */
  async getPendingOperations(req: Request, res: Response): Promise<void> {
    try {
      // Get pending operations
      const operations = await multisigService.getPendingOperations();

      res.status(200).json({
        operations,
      });
    } catch (error) {
      logger.error('Pending operations error', error);
      res.status(500).json({ error: 'Failed to get pending operations' });
    }
  }

  /**
   * Approve a multisig operation
   * @param req Request
   * @param res Response
   */
  async approveOperation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { signer_id } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Operation ID is required' });
        return;
      }

      if (!signer_id) {
        res.status(400).json({ error: 'Signer ID is required' });
        return;
      }

      // Approve the operation
      const operation = await multisigService.approveOperation(id, signer_id);

      res.status(200).json({
        message: 'Operation approved successfully',
        operation,
      });
    } catch (error) {
      logger.error('Approve operation error', error);
      res.status(500).json({ error: 'Failed to approve operation' });
    }
  }

  /**
   * Reject a multisig operation
   * @param req Request
   * @param res Response
   */
  async rejectOperation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Operation ID is required' });
        return;
      }

      // Reject the operation
      const operation = await multisigService.rejectOperation(id);

      res.status(200).json({
        message: 'Operation rejected successfully',
        operation,
      });
    } catch (error) {
      logger.error('Reject operation error', error);
      res.status(500).json({ error: 'Failed to reject operation' });
    }
  }
}

export default new TokenController();
