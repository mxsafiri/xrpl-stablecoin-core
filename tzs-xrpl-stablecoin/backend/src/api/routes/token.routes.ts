const express = require('express');
import tokenController from '../controllers/token.controller';
import { authenticateToken, requireAdminOrTreasury } from '../../middleware/auth.middleware';

const router = express.Router();

/**
 * @route POST /api/token/mint
 * @desc Request to mint new tokens (requires multisig approval)
 * @access Admin/Treasury
 */
router.post('/mint', authenticateToken, requireAdminOrTreasury, tokenController.requestMint);

/**
 * @route POST /api/token/burn
 * @desc Request to burn tokens (requires multisig approval)
 * @access Admin/Treasury
 */
router.post('/burn', authenticateToken, requireAdminOrTreasury, tokenController.requestBurn);

/**
 * @route POST /api/token/approve
 * @desc Approve a multisig operation
 * @access Admin/Treasury
 */
router.post('/approve', authenticateToken, requireAdminOrTreasury, tokenController.approveOperation);

/**
 * @route POST /api/token/transfer
 * @desc Transfer tokens between wallets
 * @access Authenticated
 */
router.post('/transfer', authenticateToken, tokenController.transferTokens);

/**
 * @route GET /api/token/balance/:wallet
 * @desc Get token balance for a wallet
 * @access Public
 */
router.get('/balance/:wallet', tokenController.getBalance);

/**
 * @route GET /api/token/transactions
 * @desc Get transaction history
 * @access Authenticated
 */
router.get('/transactions', authenticateToken, tokenController.getTransactions);

/**
 * @route GET /api/token/collateral
 * @desc Get collateral balance
 * @access Admin/Treasury
 */
router.get('/collateral', authenticateToken, requireAdminOrTreasury, tokenController.getCollateralBalance);

/**
 * @route GET /api/token/pending-operations
 * @desc Get pending operations
 * @access Admin/Treasury
 */
router.get('/pending-operations', authenticateToken, requireAdminOrTreasury, tokenController.getPendingOperations);

export default router;
