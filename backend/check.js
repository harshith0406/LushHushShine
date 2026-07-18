require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const inv = await sql`SELECT id, data FROM inventory`;
  inv.forEach(row => {
    const d = row.data;
    if (typeof d.soldQty === 'object' && d.soldQty !== null) console.log(row.id, 'soldQty is object:', d.soldQty);
    if (typeof d.price === 'object' && d.price !== null) console.log(row.id, 'price is object:', d.price);
    if (typeof d.unitCost === 'object' && d.unitCost !== null) console.log(row.id, 'unitCost is object:', d.unitCost);
    if (typeof d.availableQty === 'object' && d.availableQty !== null) console.log(row.id, 'availableQty is object:', d.availableQty);
    if (typeof d.stock === 'object' && d.stock !== null) console.log(row.id, 'stock is object:', d.stock);
  });
  console.log("Checked inventory. Total rows:", inv.length);
}

run().catch(console.error);
