// Quick script to check user balances in production database
const { neon } = require('@neondatabase/serverless');

// Use your production DATABASE_URL
const sql = neon(process.env.DATABASE_URL);

async function checkBalances() {
  try {
    console.log('Checking user balances...\n');
    
    // Get all users with their balances
    const users = await sql`
      SELECT 
        id,
        wallet_address,
        role,
        balance,
        username,
        display_name,
        created_at
      FROM users 
      ORDER BY CAST(balance AS DECIMAL) DESC
    `;
    
    console.log('Users and their balances:');
    console.log('========================');
    
    let totalUserBalance = 0;
    let totalAdminBalance = 0;
    
    users.forEach(user => {
      const balance = parseFloat(user.balance || 0);
      const role = user.role || 'user';
      const name = user.display_name || user.username || 'Unnamed';
      
      console.log(`${name} (${role}): TSh ${balance.toLocaleString()}`);
      console.log(`  Wallet: ${user.wallet_address}`);
      console.log(`  Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
      
      if (role === 'admin') {
        totalAdminBalance += balance;
      } else {
        totalUserBalance += balance;
      }
    });
    
    console.log('Summary:');
    console.log('========');
    console.log(`Total Users: ${users.filter(u => u.role !== 'admin').length}`);
    console.log(`Total User Balances: TSh ${totalUserBalance.toLocaleString()}`);
    console.log(`Total Admin Balances: TSh ${totalAdminBalance.toLocaleString()}`);
    console.log(`Grand Total: TSh ${(totalUserBalance + totalAdminBalance).toLocaleString()}`);
    
    // Check recent deposits
    console.log('\nRecent Deposits:');
    console.log('================');
    
    const deposits = await sql`
      SELECT 
        amount,
        status,
        buyer_phone,
        buyer_name,
        reference,
        created_at
      FROM pending_deposits 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    deposits.forEach(deposit => {
      console.log(`${deposit.buyer_name || 'Unknown'} (${deposit.buyer_phone}): TSh ${parseFloat(deposit.amount).toLocaleString()} - ${deposit.status}`);
      console.log(`  Date: ${new Date(deposit.created_at).toLocaleString()}`);
      console.log(`  Ref: ${deposit.reference}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking balances:', error);
  }
}

checkBalances();
