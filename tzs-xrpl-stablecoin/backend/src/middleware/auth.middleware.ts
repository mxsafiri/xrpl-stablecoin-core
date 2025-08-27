import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import userService from '../services/user.service';
import logger from '../utils/logger';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        walletAddress: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        logger.error('Invalid token', err);
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
      }

      // Add user info to request object
      req.user = decoded as { walletAddress: string; role: string };
      next();
    });
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isAdmin = await userService.isAdmin(req.user.walletAddress);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin privileges required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Authorization error', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

/**
 * Middleware to check if user has treasury role
 */
export const requireTreasury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isTreasury = await userService.isTreasury(req.user.walletAddress);
    if (!isTreasury) {
      res.status(403).json({ error: 'Treasury privileges required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Authorization error', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

/**
 * Middleware to check if user has admin or treasury role
 */
export const requireAdminOrTreasury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isAdmin = await userService.isAdmin(req.user.walletAddress);
    const isTreasury = await userService.isTreasury(req.user.walletAddress);

    if (!isAdmin && !isTreasury) {
      res.status(403).json({ error: 'Admin or Treasury privileges required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Authorization error', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};
