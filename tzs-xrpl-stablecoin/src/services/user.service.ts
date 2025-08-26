import db from '../db/connection';
import { User } from '../types';
import logger from '../utils/logger';

class UserService {
  /**
   * Create a new user
   * @param walletAddress XRPL wallet address
   * @param role User role
   */
  async createUser(
    walletAddress: string,
    role: 'admin' | 'treasury' | 'user' = 'user'
  ): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByWalletAddress(walletAddress);
      if (existingUser) {
        throw new Error(`User with wallet address ${walletAddress} already exists`);
      }

      // Create the user
      const [user] = await db('users')
        .insert({
          wallet_address: walletAddress,
          role,
          is_active: true,
        })
        .returning('*');

      logger.info(`User created: ${walletAddress} with role ${role}`);
      return user;
    } catch (error) {
      logger.error('Failed to create user', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get a user by wallet address
   * @param walletAddress XRPL wallet address
   */
  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    try {
      const user = await db('users')
        .where({ wallet_address: walletAddress })
        .first();

      return user || null;
    } catch (error) {
      logger.error(`Failed to get user by wallet address ${walletAddress}`, error);
      throw new Error(`Failed to get user by wallet address ${walletAddress}`);
    }
  }

  /**
   * Get a user by ID
   * @param userId User ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      return user || null;
    } catch (error) {
      logger.error(`Failed to get user by ID ${userId}`, error);
      throw new Error(`Failed to get user by ID ${userId}`);
    }
  }

  /**
   * Update a user's role
   * @param walletAddress XRPL wallet address
   * @param role New role
   */
  async updateUserRole(
    walletAddress: string,
    role: 'admin' | 'treasury' | 'user'
  ): Promise<User> {
    try {
      const [user] = await db('users')
        .where({ wallet_address: walletAddress })
        .update({ role })
        .returning('*');

      if (!user) {
        throw new Error(`User with wallet address ${walletAddress} not found`);
      }

      logger.info(`User role updated: ${walletAddress} to ${role}`);
      return user;
    } catch (error) {
      logger.error(`Failed to update user role for ${walletAddress}`, error);
      throw new Error(`Failed to update user role for ${walletAddress}`);
    }
  }

  /**
   * Activate or deactivate a user
   * @param walletAddress XRPL wallet address
   * @param isActive Whether the user should be active
   */
  async setUserActiveStatus(
    walletAddress: string,
    isActive: boolean
  ): Promise<User> {
    try {
      const [user] = await db('users')
        .where({ wallet_address: walletAddress })
        .update({ is_active: isActive })
        .returning('*');

      if (!user) {
        throw new Error(`User with wallet address ${walletAddress} not found`);
      }

      logger.info(`User status updated: ${walletAddress} to ${isActive ? 'active' : 'inactive'}`);
      return user;
    } catch (error) {
      logger.error(`Failed to update user status for ${walletAddress}`, error);
      throw new Error(`Failed to update user status for ${walletAddress}`);
    }
  }

  /**
   * Get all users with optional filtering
   * @param filters Optional filters for the users
   * @param page Page number for pagination
   * @param limit Number of items per page
   */
  async getUsers(
    filters: Partial<{
      role: 'admin' | 'treasury' | 'user';
      isActive: boolean;
    }> = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: User[]; total: number }> {
    try {
      const query = db('users');

      // Apply filters
      if (filters.role) {
        query.where('role', filters.role);
      }
      if (filters.isActive !== undefined) {
        query.where('is_active', filters.isActive);
      }

      // Get total count
      const [{ count }] = await query.clone().count('* as count');
      const total = parseInt(count as string, 10);

      // Get paginated results
      const offset = (page - 1) * limit;
      const users = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return { users, total };
    } catch (error) {
      logger.error('Failed to get users', error);
      throw new Error('Failed to get users');
    }
  }

  /**
   * Check if a user has a specific role
   * @param walletAddress XRPL wallet address
   * @param role Role to check
   */
  async hasRole(
    walletAddress: string,
    role: 'admin' | 'treasury' | 'user'
  ): Promise<boolean> {
    try {
      const user = await this.getUserByWalletAddress(walletAddress);
      return user?.role === role && user?.is_active === true;
    } catch (error) {
      logger.error(`Failed to check role for ${walletAddress}`, error);
      throw new Error(`Failed to check role for ${walletAddress}`);
    }
  }

  /**
   * Check if a user is an admin
   * @param walletAddress XRPL wallet address
   */
  async isAdmin(walletAddress: string): Promise<boolean> {
    return this.hasRole(walletAddress, 'admin');
  }

  /**
   * Check if a user is a treasury manager
   * @param walletAddress XRPL wallet address
   */
  async isTreasury(walletAddress: string): Promise<boolean> {
    return this.hasRole(walletAddress, 'treasury');
  }
}

export default new UserService();
