import type { Knex } from 'knex';

export async function seed(knex: any): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Insert initial admin and treasury users with multi-sig wallet addresses
  await knex('users').insert([
    {
      wallet_address: 'rfXQiN2AzW82XK6nMcU7DU1zsd4HpuQUoT', // Multi-sig admin wallet
      role: 'admin',
      is_active: true
    },
    {
      wallet_address: 'rJYHCdSGhqTy3yEbdHm8gednD1hbMSob7D', // Multi-sig treasury wallet
      role: 'treasury',
      is_active: true
    }
  ]);
}
