require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const { PostgresFirestoreDb } = require('./src/config/firebase');
  // Need to use the proper postgres db implementation just like firebase.js
  const db = require('./src/config/firebase').db;

  // Let's emulate what abc-xyz does:
  let invQuery = db.collection('inventory');
  invQuery = invQuery.where('sellingPlaceId', '==', 'upsc89p04l');
  
  const invSnapshot = await invQuery.get();

  const itemListSnapshot = await db.collection('item_list').get();
  const priceMap = {};
  itemListSnapshot.docs.forEach(doc => { 
    priceMap[doc.id] = doc.data().sellingPrice || doc.data().price || 0; 
  });

  const items = invSnapshot.docs.map(doc => {
    const d = doc.data();
    return {
      productId: doc.id,
      name: d.productName || d.name || '',
      soldQty: d.soldQty || 0,
      totalQty: d.totalQty || 0,
      price: priceMap[doc.id] || 0,
      averageDailySales: d.averageDailySales || 0,
      standardDeviation: d.standardDeviation || 1.0,
      category: d.category || ''
    };
  });

  console.log("PAYLOAD FOR ABC-XYZ:", JSON.stringify(items, null, 2));
}

run().catch(console.error);
