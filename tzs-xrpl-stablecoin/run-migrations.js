const knex = require('knex');

// Your Neon connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_3EJCNTnzM9PF@ep-green-poetry-a26ov6e8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
  migrations: {
    directory: './src/db/migrations'
  },
  seeds: {
    directory: './src/db/seeds'
  }
});

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const [batchNo, migrations] = await db.migrate.latest();
    
    if (migrations.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Batch ${batchNo} run: ${migrations.length} migrations`);
      migrations.forEach(migration => console.log(`  - ${migration}`));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
    console.log('🔌 Database connection closed');
  }
}

runMigrations();
