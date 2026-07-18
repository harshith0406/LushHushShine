require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const { PostgresFirestoreDb } = require('./src/config/firebase');
  // Need to bypass the real one. Let's just do what firebase.js does:
  const rows = await sql`SELECT id, data FROM "inventory"`;
  const docs = rows.map(row => ({
    id: row.id,
    ...row.data
  }));
  
  console.log("Spread docs length:", docs.length);
  console.log("First doc spread:", JSON.stringify(docs[0], null, 2));

  const docsMap = rows.map(row => {
    const { id, ...rest } = row;
    return {
      id,
      data: () => row.data
    }
  });

  console.log("Data() return:", JSON.stringify(docsMap[0].data(), null, 2));
}

run().catch(console.error);
