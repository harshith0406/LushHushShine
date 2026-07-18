require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const tables = ["inventory", "item_list", "sales_invoices", "purchase_orders", "vendor_scores", "batch_status", "price_predictions"];
  for (const t of tables) {
    console.log(`Cleaning ${t}...`);
    try {
      await sql(`DELETE FROM "${t}"`);
    } catch(e) {}
  }
  console.log("Database cleaned!");
}

run().catch(console.error);
