const { Client } = require('pg');
require('dotenv').config();

async function testNeonConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Connecting to Neon database...');
    await client.connect();
    
    console.log('✅ Successfully connected to Neon database!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('📊 Database info:');
    console.log('  Current time:', result.rows[0].current_time);
    console.log('  PostgreSQL version:', result.rows[0].postgres_version);
    
    // Test if we can create/drop a test table
    await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, created_at TIMESTAMP DEFAULT NOW())');
    console.log('✅ Test table created successfully');
    
    await client.query('DROP TABLE connection_test');
    console.log('✅ Test table dropped successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 Make sure your DATABASE_URL is set correctly in .env file');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

testNeonConnection();
