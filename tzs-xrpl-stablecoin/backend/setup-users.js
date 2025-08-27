require('dotenv').config();
const knex = require('knex');
const config = require('./knexfile.ts').default;

async function setupUsers() {
  const db = knex(config.development);
  
  try {
    console.log('Setting up admin and treasury users...');
    
    // Admin user
    const adminWallet = 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM';
    const existingAdmin = await db('users').where('wallet_address', adminWallet).first();
    
    if (!existingAdmin) {
      await db('users').insert({
        wallet_address: adminWallet,
        role: 'admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    // Treasury user
    const treasuryWallet = 'rMNVNXxk27WPE1zyFSPC6RRnPP7RBBGeCv';
    const existingTreasury = await db('users').where('wallet_address', treasuryWallet).first();
    
    if (!existingTreasury) {
      await db('users').insert({
        wallet_address: treasuryWallet,
        role: 'treasury',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Treasury user created');
    } else {
      console.log('ℹ️ Treasury user already exists');
    }
    
    // Show all users
    const users = await db('users').select('*');
    console.log('All users:', users);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

setupUsers();
