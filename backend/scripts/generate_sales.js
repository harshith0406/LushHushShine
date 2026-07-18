#!/usr/bin/env node
// Script to generate 30 days of synthetic sales data and write to sales_table.json
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

const products = [
  { id: 'SKU-DAIRY-001', name: 'Full Cream Milk 1L',        price: 2.99, avgQty: 5.2, std: 1.8, vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.' },
  { id: 'SKU-DAIRY-002', name: 'Salted Butter 500g',        price: 4.25, avgQty: 3.1, std: 1.2, vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.' },
  { id: 'SKU-BAKE-003',  name: 'Whole Wheat Bread 400g',   price: 3.49, avgQty: 6.8, std: 2.5, vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.' },
  { id: 'SKU-BEVE-004',  name: 'Orange Juice 1L',          price: 3.75, avgQty: 4.4, std: 2.1, vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.' },
  { id: 'SKU-SNAC-005',  name: 'Classic Potato Chips 150g',price: 1.99, avgQty: 7.2, std: 3.4, vendorId: 'VENDOR-APEX-002',  vendorName: 'Apex Distributions' },
  { id: 'SKU-SNAC-006',  name: 'Mixed Nuts 250g',          price: 5.50, avgQty: 2.9, std: 1.5, vendorId: 'VENDOR-APEX-002',  vendorName: 'Apex Distributions' },
  { id: 'SKU-HYGN-007',  name: 'Antibacterial Hand Soap 500ml', price: 2.49, avgQty: 2.1, std: 0.9, vendorId: 'VENDOR-APEX-002', vendorName: 'Apex Distributions' },
  { id: 'SKU-GROC-009',  name: 'Basmati Rice 5kg',         price: 8.99, avgQty: 8.5, std: 2.8, vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.' },
  { id: 'SKU-GROC-010',  name: 'Refined Sunflower Oil 1L', price: 3.20, avgQty: 9.1, std: 3.2, vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.' },
];

function randNormal(mean, std) {
  // Box-Muller
  const u = 1 - Math.random(), v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(0, Math.round(mean + z * std));
}

const startDate = new Date('2026-06-18T00:00:00.000Z');
const salesTable = {};
const invoiceTable = {};

for (let day = 0; day < 30; day++) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + day);
  const dateStr = date.toISOString();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const weekendBoost = isWeekend ? 1.3 : 1.0;

  const dailyItems = [];
  let dayTotal = 0;

  for (const p of products) {
    if (p.id === 'SKU-HYSE-008') continue; // ghost SKU - no sales
    const qty = Math.max(1, Math.round(randNormal(p.avgQty, p.std) * weekendBoost));
    const subtotal = parseFloat((qty * p.price).toFixed(2));
    dayTotal += subtotal;

    const txId = `TX-${date.toISOString().substring(0,10).replace(/-/g,'')}-${p.id.slice(-4)}`;
    salesTable[txId] = {
      transactionId: txId,
      itemNbr: p.id,
      totalQty: qty,
      totalSales: subtotal,
      timestamp: dateStr,
      batchNo: `B-${p.id}`,
      transactionType: 'item_sale',
      productId: p.id,
      productName: p.name,
      sku: p.id,
      quantity: qty,
      price: p.price,
      subtotal,
      sellingPlaceId: 'STORE-MAIN-001',
      sellingPlaceName: 'City Mart Supermarket',
      vendorId: p.vendorId,
      vendorName: p.vendorName,
      createdAt: dateStr
    };
    dailyItems.push({ productId: p.id, productName: p.name, sku: p.id, quantity: qty, price: p.price, subtotal });
  }

  const invId = `INV-${date.toISOString().substring(0,10).replace(/-/g,'')}`;
  invoiceTable[invId] = {
    transactionId: invId,
    totalSales: parseFloat(dayTotal.toFixed(2)),
    timestamp: dateStr,
    transactionType: 'master_invoice',
    sellingPlaceId: 'STORE-MAIN-001',
    sellingPlaceName: 'City Mart Supermarket',
    items: dailyItems,
    totalAmount: parseFloat(dayTotal.toFixed(2)),
    createdAt: dateStr
  };
}

// Merge old test entries
const existing = { 'TX-UVSG40YG': { transactionId: 'TX-UVSG40YG', itemNbr: 'TEST-SKU-ZM3B', totalQty: 5, totalSales: 22.5, timestamp: '2026-07-17T20:03:48.447Z', batchNo: 'B-TEST-SKU-ZM3B', transactionType: 'item_sale', productId: 'TEST-SKU-ZM3B', productName: 'Organic Whole Milk', sku: 'TEST-SKU-ZM3B', quantity: 5, price: 4.5, subtotal: 22.5, sellingPlaceId: 'qsnfaze1hv', sellingPlaceName: 'Test Store Inc.', vendorId: 'wbuefzjzmc', vendorName: 'Nexus Distributors Ltd.', createdAt: '2026-07-17T20:03:48.447Z' }, 'INV-ED81X0U5': { transactionId: 'INV-ED81X0U5', totalSales: 22.5, timestamp: '2026-07-17T20:03:48.448Z', transactionType: 'master_invoice', sellingPlaceId: 'qsnfaze1hv', sellingPlaceName: 'Test Store Inc.', items: [{ productId: 'TEST-SKU-ZM3B', productName: 'Organic Whole Milk', sku: 'TEST-SKU-ZM3B', quantity: 5, price: 4.5, subtotal: 22.5 }], totalAmount: 22.5, createdAt: '2026-07-17T20:03:48.448Z' } };
const combined = { ...existing, ...salesTable, ...invoiceTable };

fs.writeFileSync(path.join(dataDir, 'sales_table.json'), JSON.stringify(combined, null, 2));
console.log(`Generated ${Object.keys(salesTable).length} item_sale records and ${Object.keys(invoiceTable).length} master_invoice records.`);
console.log('Sales data written to backend/data/sales_table.json');
