import db from '../db/connection';
import { AuditLog } from '../types';
import logger from '../utils/logger';

class AuditService {
  /**
   * Log an action to the audit trail
   * @param action Description of the action
   * @param actorWallet Wallet address of the actor
   * @param actorRole Role of the actor
   * @param details Additional details about the action
   * @param ipAddress IP address of the request (optional)
   */
  async logAction(
    action: string,
    actorWallet: string,
    actorRole: 'admin' | 'treasury' | 'user' | 'system',
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<AuditLog> {
    try {
      const [auditLog] = await db('audit_logs')
        .insert({
          action,
          actor_wallet: actorWallet,
          actor_role: actorRole,
          details,
          ip_address: ipAddress,
        })
        .returning('*');

      logger.info(`Audit log created: ${action} by ${actorWallet}`);
      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', error);
      throw new Error('Failed to create audit log');
    }
  }

  /**
   * Get audit logs with optional filtering
   * @param filters Optional filters for the audit logs
   * @param page Page number for pagination
   * @param limit Number of items per page
   */
  async getAuditLogs(
    filters: Partial<{
      action: string;
      actorWallet: string;
      actorRole: 'admin' | 'treasury' | 'user' | 'system';
      fromDate: Date;
      toDate: Date;
    }> = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const query = db('audit_logs');

      // Apply filters
      if (filters.action) {
        query.where('action', 'like', `%${filters.action}%`);
      }
      if (filters.actorWallet) {
        query.where('actor_wallet', filters.actorWallet);
      }
      if (filters.actorRole) {
        query.where('actor_role', filters.actorRole);
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
      const logs = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return { logs, total };
    } catch (error) {
      logger.error('Failed to get audit logs', error);
      throw new Error('Failed to get audit logs');
    }
  }
}

export default new AuditService();
