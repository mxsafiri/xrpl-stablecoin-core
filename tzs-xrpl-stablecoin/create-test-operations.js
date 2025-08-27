require('dotenv').config();
const { Client } = require('pg');

async function createTestOperations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create test multisig operations
    const operations = [
      {
        operation_type: 'mint',
        operation_data: JSON.stringify({
          amount: 1000,
          destinationWallet: 'rTestWallet1234567890123456789012',
          reference: 'Test mint operation'
        }),
        required_signatures: 2,
        current_signatures: 1,
        status: 'pending',
        signers: JSON.stringify(['rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM'])
      },
      {
        operation_type: 'burn',
        operation_data: JSON.stringify({
          amount: 500,
          sourceWallet: 'rTestWallet9876543210987654321098',
          reference: 'Test burn operation'
        }),
        required_signatures: 2,
        current_signatures: 0,
        status: 'pending',
        signers: JSON.stringify([])
      },
      {
        operation_type: 'mint',
        operation_data: JSON.stringify({
          amount: 2500,
          destinationWallet: 'rAnotherTestWallet123456789012345',
          reference: 'Large mint operation'
        }),
        required_signatures: 3,
        current_signatures: 1,
        status: 'pending',
        signers: JSON.stringify(['rMNVNXxk27WPE1zyFSPC6RRnPP7RBBGeCv'])
      }
    ];
    
    // Insert test operations
    for (const op of operations) {
      await client.query(`
        INSERT INTO multisig_operations (
          operation_type, operation_data, required_signatures, 
          current_signatures, status, signers, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        op.operation_type,
        op.operation_data,
        op.required_signatures,
        op.current_signatures,
        op.status,
        op.signers
      ]);
    }
    
    console.log('✅ Created test multisig operations');
    
    // Show created operations
    const result = await client.query('SELECT * FROM multisig_operations WHERE status = $1', ['pending']);
    console.log(`Created ${result.rows.length} pending operations:`, result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createTestOperations();
