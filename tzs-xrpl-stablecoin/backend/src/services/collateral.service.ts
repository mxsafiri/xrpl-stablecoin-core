import db from '../db/connection';
import { CollateralEntry } from '../types';
import logger from '../utils/logger';

class CollateralService {
  /**
   * Record a collateral deposit
   * @param amount Amount deposited
   * @param referenceId Reference ID for the deposit
   * @param bankTransactionId Bank transaction ID (optional)
   */
  async recordDeposit(
    amount: number,
    referenceId: string,
    bankTransactionId?: string
  ): Promise<CollateralEntry> {
    try {
      const [entry] = await db('collateral_ledger')
        .insert({
          amount,
          reference_id: referenceId,
          type: 'deposit',
          bank_transaction_id: bankTransactionId,
        })
        .returning('*');

      logger.info(`Collateral deposit recorded: ${amount} TZS, ref: ${referenceId}`);
      return entry;
    } catch (error) {
      logger.error('Failed to record collateral deposit', error);
      throw new Error('Failed to record collateral deposit');
    }
  }

  /**
   * Record a collateral withdrawal
   * @param amount Amount withdrawn
   * @param referenceId Reference ID for the withdrawal
   * @param bankTransactionId Bank transaction ID (optional)
   */
  async recordWithdrawal(
    amount: number,
    referenceId: string,
    bankTransactionId?: string
  ): Promise<CollateralEntry> {
    try {
      const [entry] = await db('collateral_ledger')
        .insert({
          amount,
          reference_id: referenceId,
          type: 'withdrawal',
          bank_transaction_id: bankTransactionId,
        })
        .returning('*');

      logger.info(`Collateral withdrawal recorded: ${amount} TZS, ref: ${referenceId}`);
      return entry;
    } catch (error) {
      logger.error('Failed to record collateral withdrawal', error);
      throw new Error('Failed to record collateral withdrawal');
    }
  }

  /**
   * Get the current collateral balance
   */
  async getCollateralBalance(): Promise<number> {
    try {
      const deposits = await db('collateral_ledger')
        .where({ type: 'deposit' })
        .sum('amount as total')
        .first();

      const withdrawals = await db('collateral_ledger')
        .where({ type: 'withdrawal' })
        .sum('amount as total')
        .first();

      const totalDeposits = deposits?.total ? parseFloat(deposits.total as string) : 0;
      const totalWithdrawals = withdrawals?.total ? parseFloat(withdrawals.total as string) : 0;

      return totalDeposits - totalWithdrawals;
    } catch (error) {
      logger.error('Failed to get collateral balance', error);
      throw new Error('Failed to get collateral balance');
    }
  }

  /**
   * Get collateral ledger entries with optional filtering
   * @param filters Optional filters for the ledger entries
   * @param page Page number for pagination
   * @param limit Number of items per page
   */
  async getLedgerEntries(
    filters: Partial<{
      type: 'deposit' | 'withdrawal';
      referenceId: string;
      bankTransactionId: string;
      fromDate: Date;
      toDate: Date;
    }> = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: CollateralEntry[]; total: number }> {
    try {
      const query = db('collateral_ledger');

      // Apply filters
      if (filters.type) {
        query.where('type', filters.type);
      }
      if (filters.referenceId) {
        query.where('reference_id', filters.referenceId);
      }
      if (filters.bankTransactionId) {
        query.where('bank_transaction_id', filters.bankTransactionId);
      }
      if (filters.fromDate) {
        query.where('created_at', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        query.where('created_at', '<=', filters.toDate);
      }

      // Get total count
      const [{ count }] = await query.clone().count('* as count');
      const total = parseInt(count as string, 10);

      // Get paginated results
      const offset = (page - 1) * limit;
      const entries = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return { entries, total };
    } catch (error) {
      logger.error('Failed to get collateral ledger entries', error);
      throw new Error('Failed to get collateral ledger entries');
    }
  }

  /**
   * Get a collateral ledger entry by ID
   * @param entryId Entry ID
   */
  async getLedgerEntryById(entryId: string): Promise<CollateralEntry | null> {
    try {
      const entry = await db('collateral_ledger')
        .where({ id: entryId })
        .first();

      return entry || null;
    } catch (error) {
      logger.error(`Failed to get collateral ledger entry ${entryId}`, error);
      throw new Error(`Failed to get collateral ledger entry ${entryId}`);
    }
  }

  /**
   * Get a collateral ledger entry by reference ID
   * @param referenceId Reference ID
   */
  async getLedgerEntryByReferenceId(referenceId: string): Promise<CollateralEntry | null> {
    try {
      const entry = await db('collateral_ledger')
        .where({ reference_id: referenceId })
        .first();

      return entry || null;
    } catch (error) {
      logger.error(`Failed to get collateral ledger entry by reference ${referenceId}`, error);
      throw new Error(`Failed to get collateral ledger entry by reference ${referenceId}`);
    }
  }
}

export default new CollateralService();
