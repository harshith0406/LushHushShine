require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);
const DATA_DIR = path.join(__dirname, 'data');

async function run() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const colName = file.replace('.json', '');
    const dataPath = path.join(DATA_DIR, file);
    const dataMap = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const entries = Object.entries(dataMap);
    if (entries.length === 0) continue;
    
    console.log(`Seeding ${entries.length} into ${colName}...`);
    
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pool.query(`CREATE TABLE IF NOT EXISTS "${colName}" (id VARCHAR(255) PRIMARY KEY, data JSONB)`);
    
    // Batch inserts
    const BATCH_SIZE = 50;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const valuesStr = batch.map((_, idx) => `($${idx*2 + 1}, $${idx*2 + 2}::jsonb)`).join(',');
      const params = batch.flatMap(([id, val]) => [id, JSON.stringify(val)]);
      
      const query = `INSERT INTO "${colName}" (id, data) VALUES ${valuesStr} ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
      
      try {
        // We have to use the untagged postgres client to pass dynamic params easily
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await pool.query(query, params);
        await pool.end();
      } catch (err) {
        console.error(`Batch insert failed for ${colName}:`, err.message);
      }
    }
  }
  console.log("Bulk seeding complete.");
}

run().catch(console.error);
