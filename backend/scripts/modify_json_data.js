const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

// 1. Augment Inventory with specific AI test cases
const inventoryPath = path.join(dataDir, 'inventory.json');
let inventory = {};
if (fs.existsSync(inventoryPath)) {
  inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
}

// Ensure Ghost SKU
inventory['SKU-GHOST-001'] = {
  "itemNbr": "SKU-GHOST-001",
  "batchNo": "B-GHOST-001",
  "totalQty": 100,
  "soldQty": 0,
  "availableQty": 100,
  "stock": 100,
  "reorderPoint": 10,
  "averageDailySales": 0,
  "standardDeviation": 0,
  "leadTimeDays": 5,
  "updatedAt": "2026-06-01T10:00:00.000Z", // 45+ days ago
  "productId": "SKU-GHOST-001",
  "productName": "Unpopular Toothpaste",
  "sku": "SKU-GHOST-001",
  "category": "Hygiene",
  "sellingPlaceId": "STORE-MAIN-001",
  "vendorId": "VENDOR-APEX-002",
  "unitCost": 2.50
};

// Ensure Risky SKU
inventory['SKU-RISK-002'] = {
  "itemNbr": "SKU-RISK-002",
  "batchNo": "B-RISK-002",
  "totalQty": 50,
  "soldQty": 45,
  "availableQty": 5, // Extremely low
  "stock": 5,
  "reorderPoint": 20,
  "averageDailySales": 10, // Sells 10 a day
  "standardDeviation": 2,
  "leadTimeDays": 7, // Takes 7 days to arrive
  "updatedAt": "2026-07-18T10:00:00.000Z",
  "productId": "SKU-RISK-002",
  "productName": "Critical Energy Drink",
  "sku": "SKU-RISK-002",
  "category": "Beverages",
  "sellingPlaceId": "STORE-MAIN-001",
  "vendorId": "VENDOR-NEXUS-001",
  "unitCost": 1.50
};

fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));

// 2. Augment Batches for expiry
const batchPath = path.join(dataDir, 'batch_status.json');
let batches = {};
if (fs.existsSync(batchPath)) {
  batches = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
}

batches['B-EXP-001'] = {
  "batchNo": "B-EXP-001",
  "productId": "SKU-DAIRY-001",
  "productName": "Full Cream Milk 1L",
  "mfgDate": "2026-07-01",
  "expDate": "2026-07-20", // Expires in 2 days
  "quantity": 25,
  "sellingPlaceId": "STORE-MAIN-001",
  "vendorId": "VENDOR-NEXUS-001",
  "createdAt": "2026-07-01T10:00:00.000Z"
};
fs.writeFileSync(batchPath, JSON.stringify(batches, null, 2));

// 3. Augment Sales for Anomaly Detection (Spike and Crash)
const salesPath = path.join(dataDir, 'sales.json');
let sales = {};
if (fs.existsSync(salesPath)) {
  try {
    sales = JSON.parse(fs.readFileSync(salesPath, 'utf8'));
  } catch(e) { sales = {}; }
}

const generateSalesForProduct = (productId, baseCount, isSpike) => {
  const dates = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"];
  
  dates.forEach((date, i) => {
    let qty = baseCount;
    // On the last day, create a spike or crash
    if (i === 4) {
      if (isSpike) qty = baseCount * 5; // Spike!
      else if (isSpike === false) qty = 0; // Crash!
    }
    
    // Create multiple small transactions to sum up to qty
    for(let j=0; j<qty; j++) {
      const txId = `TX-${productId}-${date}-${j}`;
      sales[txId] = {
        "transactionId": txId,
        "itemNbr": productId,
        "productId": productId,
        "quantity": 1,
        "price": 5.0,
        "subtotal": 5.0,
        "transactionType": "item_sale",
        "createdAt": `${date}T10:00:00.000Z`
      };
    }
  });
};

generateSalesForProduct('SKU-SPIKE-003', 5, true); // Normal 5/day, then 25
generateSalesForProduct('SKU-CRASH-004', 10, false); // Normal 10/day, then 0

// Need to make sure these exist in inventory too
inventory['SKU-SPIKE-003'] = {
  "itemNbr": "SKU-SPIKE-003",
  "productId": "SKU-SPIKE-003",
  "productName": "Viral Trending Snack",
  "stock": 50,
  "availableQty": 50
};
inventory['SKU-CRASH-004'] = {
  "itemNbr": "SKU-CRASH-004",
  "productId": "SKU-CRASH-004",
  "productName": "Recalled Widget",
  "stock": 50,
  "availableQty": 50
};

fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
fs.writeFileSync(salesPath, JSON.stringify(sales, null, 2));

console.log("Mock data augmented successfully.");
