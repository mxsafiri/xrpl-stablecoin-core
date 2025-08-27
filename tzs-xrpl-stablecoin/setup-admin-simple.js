require('dotenv').config();
const { Client } = require('pg');

async function setupAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Admin user
    const adminWallet = 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM';
    const adminCheck = await client.query('SELECT * FROM users WHERE wallet_address = $1', [adminWallet]);
    
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (wallet_address, role, is_active, created_at, updated_at) 
        VALUES ($1, 'admin', true, NOW(), NOW())
      `, [adminWallet]);
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    // Treasury user  
    const treasuryWallet = 'rMNVNXxk27WPE1zyFSPC6RRnPP7RBBGeCv';
    const treasuryCheck = await client.query('SELECT * FROM users WHERE wallet_address = $1', [treasuryWallet]);
    
    if (treasuryCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (wallet_address, role, is_active, created_at, updated_at) 
        VALUES ($1, 'treasury', true, NOW(), NOW())
      `, [treasuryWallet]);
      console.log('✅ Treasury user created');
    } else {
      console.log('ℹ️ Treasury user already exists');
    }
    
    // Show all users
    const users = await client.query('SELECT wallet_address, role, is_active FROM users');
    console.log('All users:', users.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

setupAdmin();
