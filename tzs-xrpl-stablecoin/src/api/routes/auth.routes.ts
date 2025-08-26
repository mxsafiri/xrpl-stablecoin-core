import { Router } from 'express';
import authController from '../controllers/auth.controller';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Login with wallet signature
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/register
 * @desc Register a new wallet
 * @access Public
 */
router.post('/register', authController.register);

export default router;
