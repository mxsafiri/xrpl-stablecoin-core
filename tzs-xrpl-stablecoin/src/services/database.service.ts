import db from '../db/connection';
import logger from '../utils/logger';

export class DatabaseService {
  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await db.raw('SELECT 1');
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      return false;
    }
  }

  /**
   * Get database health status
   */
  static async getHealthStatus() {
    try {
      const result = await db.raw('SELECT NOW() as current_time, version() as postgres_version');
      const connectionCount = await db.raw('SELECT count(*) as active_connections FROM pg_stat_activity');
      
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].postgres_version,
        activeConnections: connectionCount.rows[0].active_connections
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run pending migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...');
      const [batchNo, migrations] = await db.migrate.latest();
      
      if (migrations.length === 0) {
        logger.info('Database is already up to date');
      } else {
        logger.info(`Batch ${batchNo} run: ${migrations.length} migrations`);
        migrations.forEach(migration => logger.info(`- ${migration}`));
      }
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback last migration batch
   */
  static async rollbackMigrations(): Promise<void> {
    try {
      logger.info('Rolling back last migration batch...');
      const [batchNo, migrations] = await db.migrate.rollback();
      
      if (migrations.length === 0) {
        logger.info('No migrations to rollback');
      } else {
        logger.info(`Batch ${batchNo} rolled back: ${migrations.length} migrations`);
        migrations.forEach(migration => logger.info(`- ${migration}`));
      }
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Run database seeds
   */
  static async runSeeds(): Promise<void> {
    try {
      logger.info('Running database seeds...');
      await db.seed.run();
      logger.info('Seeds completed successfully');
    } catch (error) {
      logger.error('Seeding failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static async closeConnection(): Promise<void> {
    try {
      await db.destroy();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

export default DatabaseService;
