const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const generateId = () => Math.random().toString(36).substring(2, 10);

// Load login credentials to map data to actual users
const loginPath = path.join(DATA_DIR, 'login_credentials.json');
let sellers = ["STORE-MAIN-001"];
let vendorIds = ["v_nexus", "v_apex", "v_fresh"];

if (fs.existsSync(loginPath)) {
  const users = JSON.parse(fs.readFileSync(loginPath, 'utf8'));
  const foundSellers = Object.values(users).filter(u => u.role === 'seller').map(u => u.uid);
  const foundVendors = Object.values(users).filter(u => u.role === 'vendor').map(u => u.uid);
  if (foundSellers.length > 0) sellers = foundSellers;
  if (foundVendors.length > 0) vendorIds = foundVendors;
}

const getVendorId = (index) => vendorIds[index % vendorIds.length];

// VENDORS
const vendors = {};
vendorIds.forEach((vid, idx) => {
  vendors[vid] = { vendorId: vid, name: `Mock Vendor ${idx+1}`, email: `vendor${idx}@test.com`, phone: "9876543210", address: "500 Logistics Way", companyName: `Supplier Co ${idx+1}` };
});

// PRODUCTS
const products = {
  "p_bread": { productId: "p_bread", name: "Whole Wheat Bread", category: "Bakery", price: 3.50, unitCost: 2.10, vendorId: getVendorId(0) },
  "p_milk": { productId: "p_milk", name: "Organic Whole Milk", category: "Dairy", price: 4.80, unitCost: 3.00, vendorId: getVendorId(1) },
  "p_oil": { productId: "p_oil", name: "Sunflower Oil 1L", category: "Pantry", price: 6.50, unitCost: 4.00, vendorId: getVendorId(2) },
  "p_nuts": { productId: "p_nuts", name: "Mixed Nuts 500g", category: "Snacks", price: 12.00, unitCost: 6.90, vendorId: getVendorId(0) },
  "p_paste": { productId: "p_paste", name: "Mint Toothpaste", category: "Personal Care", price: 2.50, unitCost: 1.20, vendorId: getVendorId(1) },
  "p_rice": { productId: "p_rice", name: "Basmati Rice 5kg", category: "Pantry", price: 18.00, unitCost: 12.00, vendorId: getVendorId(2) },
  "p_oj": { productId: "p_oj", name: "Fresh Orange Juice", category: "Beverages", price: 5.00, unitCost: 3.20, vendorId: getVendorId(0) }
};

const inventory = {};
const batch_status = {};
const sales = {};

const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

sellers.forEach((sellerId, sellerIdx) => {
  // Inventory per seller
  inventory[`${sellerId}_bread`] = { productId: "p_bread", name: "Whole Wheat Bread", availableQty: 2, stock: 2, reorderPoint: 20, averageDailySales: 5, standardDeviation: 1.5, leadTimeDays: 2, sellingPlaceId: sellerId, vendorId: getVendorId(0) };
  inventory[`${sellerId}_milk`] = { productId: "p_milk", name: "Organic Whole Milk", availableQty: 120, stock: 120, reorderPoint: 30, averageDailySales: 15, standardDeviation: 4.0, leadTimeDays: 1, sellingPlaceId: sellerId, vendorId: getVendorId(1) };
  inventory[`${sellerId}_oil`] = { productId: "p_oil", name: "Sunflower Oil 1L", availableQty: 40, stock: 40, reorderPoint: 50, averageDailySales: 8, standardDeviation: 2.0, leadTimeDays: 5, sellingPlaceId: sellerId, vendorId: getVendorId(2) };
  inventory[`${sellerId}_nuts`] = { productId: "p_nuts", name: "Mixed Nuts 500g", availableQty: 5, stock: 5, reorderPoint: 15, averageDailySales: 4, standardDeviation: 1.2, leadTimeDays: 7, sellingPlaceId: sellerId, vendorId: getVendorId(0) };
  inventory[`${sellerId}_paste`] = { productId: "p_paste", name: "Mint Toothpaste", availableQty: 200, stock: 200, reorderPoint: 50, averageDailySales: 0, standardDeviation: 0, leadTimeDays: 3, updatedAt: new Date(Date.now() - 40*24*60*60*1000).toISOString(), sellingPlaceId: sellerId, vendorId: getVendorId(1) };
  inventory[`${sellerId}_rice`] = { productId: "p_rice", name: "Basmati Rice 5kg", availableQty: 150, stock: 150, reorderPoint: 40, averageDailySales: 10, standardDeviation: 2.5, leadTimeDays: 4, sellingPlaceId: sellerId, vendorId: getVendorId(2) };
  inventory[`${sellerId}_oj`] = { productId: "p_oj", name: "Fresh Orange Juice", availableQty: 25, stock: 25, reorderPoint: 30, averageDailySales: 6, standardDeviation: 1.8, leadTimeDays: 2, sellingPlaceId: sellerId, vendorId: getVendorId(0) };

  // Batches per seller
  batch_status[`${sellerId}_b_milk`] = { batchId: `B-MILK-${sellerIdx}`, productId: "p_milk", productName: "Organic Whole Milk", expiryDate: nextWeek, initialQty: 100, remainingQty: 46, status: "active", sellingPlaceId: sellerId };
  batch_status[`${sellerId}_b_bread`] = { batchId: `B-BREAD-${sellerIdx}`, productId: "p_bread", productName: "Whole Wheat Bread", expiryDate: tomorrow, initialQty: 50, remainingQty: 2, status: "active", sellingPlaceId: sellerId };
  batch_status[`${sellerId}_b_oj`] = { batchId: `B-OJ-${sellerIdx}`, productId: "p_oj", productName: "Fresh Orange Juice", expiryDate: nextMonth, initialQty: 150, remainingQty: 25, status: "active", sellingPlaceId: sellerId };

  // Sales per seller
  const generateSales = (productId, baseDaily, anomalyDate = null, anomalyMultiplier = 1) => {
    for (let i = 30; i >= 0; i--) {
      let qty = Math.max(0, Math.round(baseDaily + (Math.random() * 4 - 2)));
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
      
      if (anomalyDate && i === anomalyDate) {
        qty = Math.round(qty * anomalyMultiplier); // Spike or Crash
      }

      const id = generateId();
      sales[id] = {
        transactionId: id,
        productId,
        qty,
        quantity: qty,
        revenue: qty * products[productId].price,
        subtotal: qty * products[productId].price,
        transactionType: "item_sale",
        date,
        createdAt: date,
        timestamp: date,
        sellingPlaceId: sellerId,
        vendorId: products[productId].vendorId
      };
    }
  };

  generateSales("p_bread", 5, 2, 3);
  generateSales("p_milk", 15);
  generateSales("p_oil", 8);
  generateSales("p_nuts", 4);
  generateSales("p_paste", 0);
  generateSales("p_rice", 10, 5, 0.1);
  generateSales("p_oj", 6);
});

// Save to JSON files
const saveFile = (filename, data) => {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  console.log(`Saved ${filename} with ${Object.keys(data).length} records`);
};

saveFile('vendors.json', vendors);
saveFile('products.json', products);
saveFile('item_list.json', products);
saveFile('inventory.json', inventory);
saveFile('batch_status.json', batch_status);
saveFile('sales_table.json', sales);

// Also save basic sales metrics array for the dashboard (although usually generated dynamically)
saveFile('sales.json', {
  "summary_1": {
    "totalRevenue": 24500.50,
    "growthPct": 12.4,
    "invoiceCount": 1420,
    "invoiceGrowth": 8.2
  }
});

console.log(`Mock data generation complete for ${sellers.length} sellers. Ready to seed!`);
