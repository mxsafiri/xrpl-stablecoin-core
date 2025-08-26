import { Knex } from 'knex';

// Type definitions for Knex migration table parameters
declare module 'knex' {
  namespace Knex {
    interface TableBuilder {
      uuid(columnName: string): ColumnBuilder;
      timestamps(useTimestamps?: boolean, defaultToNow?: boolean): ColumnBuilder;
    }
  }
}
