require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || process.env['1hsdb_DATABASE_URL'] || 'postgresql://neondb_owner:npg_VtGUZB4Lu8wk@ep-ancient-violet-avdi1zbi-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SOURCE_DATA_DIR = path.join(__dirname, '../data');
const COLLECTIONS = [
  'batch_status', 'inventory', 'item_list', 'login_credentials', 
  'notifications', 'products', 'purchaseOrders', 'sales', 
  'sales_table', 'sellingPlaces', 'users', 'vendor_status', 'vendors'
];

async function seed() {
  console.log('Connecting to Neon DB:', DB_URL);
  
  const pool = new Pool({ connectionString: DB_URL });

  for (const colName of COLLECTIONS) {
    console.log(`Processing collection: ${colName}`);
    await pool.query(`CREATE TABLE IF NOT EXISTS "${colName}" (id VARCHAR(255) PRIMARY KEY, data JSONB)`);
    
    const filePath = path.join(SOURCE_DATA_DIR, `${colName}.json`);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      try {
        const dataMap = JSON.parse(fileContent);
        const keys = Object.keys(dataMap);
        if (keys.length > 0) {
          console.log(`Found ${keys.length} records. Upserting...`);
          for (const [id, value] of Object.entries(dataMap)) {
            await pool.query(
              `INSERT INTO "${colName}" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`, 
              [id, JSON.stringify(value)]
            );
          }
        }
      } catch (err) {
        console.error(`Failed to parse/seed "${colName}":`, err.message);
      }
    }
  }
  
  console.log('Seeding completed successfully!');
  await pool.end();
}

seed().catch(err => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
