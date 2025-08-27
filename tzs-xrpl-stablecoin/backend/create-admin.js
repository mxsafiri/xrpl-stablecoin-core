const { Client } = require('pg');

async function createAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check existing users
    const existingUsers = await client.query('SELECT * FROM users');
    console.log('Existing users:', existingUsers.rows);
    
    // Create admin user if doesn't exist
    const adminWallet = 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM';
    const existingAdmin = await client.query('SELECT * FROM users WHERE wallet_address = $1', [adminWallet]);
    
    if (existingAdmin.rows.length === 0) {
      console.log('Creating admin user...');
      await client.query(`
        INSERT INTO users (wallet_address, role, is_active, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5)
      `, [adminWallet, 'admin', true, new Date(), new Date()]);
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    // Also create treasury user
    const treasuryWallet = 'rMNVNXxk27WPE1zyFSPC6RRnPP7RBBGeCv';
    const existingTreasury = await client.query('SELECT * FROM users WHERE wallet_address = $1', [treasuryWallet]);
    
    if (existingTreasury.rows.length === 0) {
      console.log('Creating treasury user...');
      await client.query(`
        INSERT INTO users (wallet_address, role, is_active, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5)
      `, [treasuryWallet, 'treasury', true, new Date(), new Date()]);
      console.log('Treasury user created successfully');
    } else {
      console.log('Treasury user already exists');
    }
    
    // Show final users
    const finalUsers = await client.query('SELECT * FROM users');
    console.log('Final users:', finalUsers.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createAdmin();
