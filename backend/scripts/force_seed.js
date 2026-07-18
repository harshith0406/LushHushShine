const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_URL = process.env.DATABASE_URL || 'postgresql://ep-ancient-violet-avdi1zbi-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = new Pool({ connectionString: DB_URL });

const DATA_DIR = path.join(__dirname, '../data');
const COLLECTIONS = [
  'batch_status', 'inventory', 'item_list', 'login_credentials', 
  'notifications', 'products', 'purchaseOrders', 'sales', 
  'sales_table', 'sellingPlaces', 'users', 'vendor_status', 'vendors'
];

async function seed() {
  console.log('Forcefully seeding Postgres database...');
  for (const colName of COLLECTIONS) {
    const filePath = path.join(DATA_DIR, `${colName}.json`);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      try {
        const dataMap = JSON.parse(fileContent);
        if (Object.keys(dataMap).length > 0) {
          console.log(`Seeding ${Object.keys(dataMap).length} records into "${colName}"...`);
          await sql.query(`CREATE TABLE IF NOT EXISTS "${colName}" (id VARCHAR(255) PRIMARY KEY, data JSONB)`);
          for (const [id, value] of Object.entries(dataMap)) {
            await sql.query(`INSERT INTO "${colName}" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`, [id, JSON.stringify(value)]);
          }
        }
      } catch (err) {
        console.error(`Failed to seed ${colName}: ${err.message}`);
      }
    }
  }
  console.log('Done!');
  process.exit(0);
}

seed();
