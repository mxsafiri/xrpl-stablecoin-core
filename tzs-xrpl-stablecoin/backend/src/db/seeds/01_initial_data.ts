import type { Knex } from 'knex';

export async function seed(knex: any): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Insert initial admin and treasury users
  // In a production environment, these would be properly secured wallets
  await knex('users').insert([
    {
      wallet_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', // Example admin wallet (testnet)
      role: 'admin',
      is_active: true
    },
    {
      wallet_address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', // Example treasury wallet (testnet)
      role: 'treasury',
      is_active: true
    }
  ]);
}
