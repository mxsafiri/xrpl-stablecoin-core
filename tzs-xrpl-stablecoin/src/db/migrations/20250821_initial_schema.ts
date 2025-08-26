import type { Knex } from 'knex';

export async function up(knex: any): Promise<void> {
  // Create users table with role-based access
  await knex.schema.createTable('users', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('wallet_address').notNullable().unique();
    table.enum('role', ['admin', 'treasury', 'user']).notNullable().defaultTo('user');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // Create collateral_ledger table to track TZS backing
  await knex.schema.createTable('collateral_ledger', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.decimal('amount', 20, 6).notNullable();
    table.string('reference_id').notNullable();
    table.enum('type', ['deposit', 'withdrawal']).notNullable();
    table.string('bank_transaction_id').nullable();
    table.timestamps(true, true);
  });

  // Create transactions table for mint/burn/transfer history
  await knex.schema.createTable('transactions', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('xrpl_transaction_hash').notNullable().unique();
    table.enum('type', ['mint', 'burn', 'transfer']).notNullable();
    table.string('from_wallet').notNullable();
    table.string('to_wallet').notNullable();
    table.decimal('amount', 20, 6).notNullable();
    table.uuid('collateral_id').references('id').inTable('collateral_ledger').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Create multisig_operations table for tracking multisig approvals
  await knex.schema.createTable('multisig_operations', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('operation_type', ['mint', 'burn', 'config_change']).notNullable();
    table.jsonb('operation_data').notNullable();
    table.integer('required_signatures').notNullable();
    table.integer('current_signatures').notNullable().defaultTo(0);
    table.enum('status', ['pending', 'approved', 'rejected', 'executed']).notNullable().defaultTo('pending');
    table.jsonb('signers').notNullable().defaultTo('[]');
    table.string('xrpl_transaction_hash').nullable();
    table.timestamps(true, true);
  });

  // Create audit_logs table for security audit trail
  await knex.schema.createTable('audit_logs', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('action').notNullable();
    table.string('actor_wallet').notNullable();
    table.enum('actor_role', ['admin', 'treasury', 'user', 'system']).notNullable();
    table.jsonb('details').notNullable();
    table.string('ip_address').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('multisig_operations');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('collateral_ledger');
  await knex.schema.dropTableIfExists('users');
}
