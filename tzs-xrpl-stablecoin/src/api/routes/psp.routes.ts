import { Router } from 'express';
import { authenticateToken, requireAdminOrTreasury } from '../../middleware/auth.middleware';
import pspController from '../controllers/psp.controller';

const router = Router();

/**
 * @route POST /api/psp/deposit
 * @desc Process a fiat deposit and initiate token minting
 * @access Admin/Treasury
 */
router.post('/deposit', authenticateToken, requireAdminOrTreasury, pspController.processFiatDeposit);

/**
 * @route POST /api/psp/withdraw
 * @desc Process a fiat withdrawal and initiate token burning
 * @access Admin/Treasury
 */
router.post('/withdraw', authenticateToken, requireAdminOrTreasury, pspController.processFiatWithdrawal);

/**
 * @route GET /api/psp/transaction/:id
 * @desc Check status of a PSP transaction
 * @access Admin/Treasury
 */
router.get('/transaction/:id', authenticateToken, requireAdminOrTreasury, pspController.checkTransactionStatus);

/**
 * @route GET /api/psp/verify-account/:accountNumber
 * @desc Verify a bank account exists and is valid
 * @access Admin/Treasury
 */
router.get('/verify-account/:accountNumber', authenticateToken, requireAdminOrTreasury, pspController.verifyBankAccount);

/**
 * @route GET /api/psp/exchange-rate
 * @desc Get exchange rate between TZS and other currencies
 * @access Public
 */
router.get('/exchange-rate', pspController.getExchangeRate);

export default router;
