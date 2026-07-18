const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({path: '.env'});
const sql = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await sql.query('CREATE TABLE IF NOT EXISTS test_tb (id VARCHAR(255) PRIMARY KEY, data JSONB)');
    await sql.query('INSERT INTO test_tb (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', ['1', JSON.stringify({a:1})]);
    console.log('OK');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    sql.end();
  }
}
run();
