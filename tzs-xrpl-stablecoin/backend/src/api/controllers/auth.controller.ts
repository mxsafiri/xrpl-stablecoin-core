import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Wallet } from 'xrpl';
import config from '../../config';
import userService from '../../services/user.service';
import auditService from '../../services/audit.service';
import logger from '../../utils/logger';

class AuthController {
  /**
   * Generate a JWT token for a wallet
   * @param req Request
   * @param res Response
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress, signature, message } = req.body;

      if (!walletAddress || !signature || !message) {
        res.status(400).json({ error: 'Wallet address, signature, and message are required' });
        return;
      }

      // Verify the signature (simplified for demo - in production use proper verification)
      // In a real implementation, you would verify that the signature was created by the wallet
      // This is a placeholder for the actual signature verification logic
      const isValidSignature = true; // Replace with actual verification

      if (!isValidSignature) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Check if user exists, if not create a new user
      let user = await userService.getUserByWalletAddress(walletAddress);
      if (!user) {
        user = await userService.createUser(walletAddress, 'user');
      }

      // Check if user is active
      if (!user.is_active) {
        res.status(403).json({ error: 'User account is inactive' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { walletAddress: user.wallet_address, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiry }
      );

      // Log the login
      await auditService.logAction(
        'user_login',
        user.wallet_address,
        user.role as any,
        { ip: req.ip },
        req.ip
      );

      res.status(200).json({
        token,
        user: {
          walletAddress: user.wallet_address,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Login error', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Register a new wallet
   * @param req Request
   * @param res Response
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      // Check if user already exists
      const existingUser = await userService.getUserByWalletAddress(walletAddress);
      if (existingUser) {
        res.status(409).json({ error: 'User with this wallet address already exists' });
        return;
      }

      // Create a new user
      const user = await userService.createUser(walletAddress, 'user');

      // Log the registration
      await auditService.logAction(
        'user_registered',
        user.wallet_address,
        'user',
        { ip: req.ip },
        req.ip
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          walletAddress: user.wallet_address,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Registration error', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
}

export default new AuthController();
