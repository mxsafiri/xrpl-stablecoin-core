const knex = require('knex');

// Your Neon connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
  seeds: {
    directory: './src/db/seeds'
  }
});

async function runSeeds() {
  try {
    console.log('🔄 Running database seeds...');
    
    await db.seed.run();
    console.log('✅ Seeds completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
    console.log('🔌 Database connection closed');
  }
}

runSeeds();
