import { Request, Response } from 'express';
import pspService from '../../services/psp.service';
import tokenService from '../../services/token.service';
import multisigService from '../../services/multisig.service';
import logger from '../../utils/logger';

/**
 * PSP Controller for handling payment service provider integrations
 */
class PspController {
  /**
   * Process a fiat deposit and initiate token minting
   */
  async processFiatDeposit(req: Request, res: Response): Promise<void> {
    try {
      const { amount, bankAccountNumber, destinationWallet, reference } = req.body;

      // Validate input
      if (!amount || !bankAccountNumber || !destinationWallet) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Process the fiat deposit through PSP
      const pspResult = await pspService.processFiatDeposit(
        amount,
        bankAccountNumber,
        reference || `deposit-${Date.now()}`
      );

      if (!pspResult.success) {
        res.status(400).json({ error: pspResult.error });
        return;
      }

      // Create a mint request (this will be pending until approved via multisig)
      const mintRequest = await tokenService.requestMint(
        amount,
        destinationWallet,
        reference || `deposit-${Date.now()}`,
        pspResult.hash
      );

      res.status(200).json({
        success: true,
        message: 'Fiat deposit processed and mint operation created',
        pspTransaction: pspResult.result,
        mintOperation: mintRequest
      });
    } catch (error) {
      logger.error('Error processing fiat deposit', error);
      res.status(500).json({
        error: 'Failed to process fiat deposit',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Process a fiat withdrawal and initiate token burning
   */
  async processFiatWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { amount, bankAccountNumber, sourceWallet, walletSeed, reference } = req.body;

      // Validate input
      if (!amount || !bankAccountNumber || !sourceWallet) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Create a burn request (this will be pending until approved via multisig)
      const burnRequest = await tokenService.requestBurn(
        amount,
        sourceWallet,
        reference || `withdrawal-${Date.now()}`
      );

      if (!burnRequest.success) {
        res.status(400).json({ error: burnRequest.error });
        return;
      }

      // Process the fiat withdrawal through PSP
      const pspResult = await pspService.processFiatWithdrawal(
        amount,
        bankAccountNumber,
        reference || `withdrawal-${Date.now()}`
      );

      res.status(200).json({
        success: true,
        message: 'Burn operation created and fiat withdrawal initiated',
        burnOperation: burnRequest.result,
        pspTransaction: pspResult.result
      });
    } catch (error) {
      logger.error('Error processing fiat withdrawal', error);
      res.status(500).json({
        error: 'Failed to process fiat withdrawal',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check status of a PSP transaction
   */
  async checkTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Transaction ID is required' });
        return;
      }

      const status = await pspService.checkTransactionStatus(id);
      res.status(200).json(status);
    } catch (error) {
      logger.error('Error checking transaction status', error);
      res.status(500).json({
        error: 'Failed to check transaction status',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Verify a bank account exists and is valid
   */
  async verifyBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accountNumber } = req.params;

      if (!accountNumber) {
        res.status(400).json({ error: 'Account number is required' });
        return;
      }

      const isValid = await pspService.verifyBankAccount(accountNumber);
      res.status(200).json({ valid: isValid });
    } catch (error) {
      logger.error('Error verifying bank account', error);
      res.status(500).json({
        error: 'Failed to verify bank account',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get exchange rate between TZS and other currencies
   */
  async getExchangeRate(req: Request, res: Response): Promise<void> {
    try {
      const { base = 'TZS', target = 'USD' } = req.query;

      const rate = await pspService.getExchangeRate(
        base as string,
        target as string
      );

      res.status(200).json({
        base,
        target,
        rate,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting exchange rate', error);
      res.status(500).json({
        error: 'Failed to get exchange rate',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default new PspController();
