const axios = require('axios');
const app = require('./src/server');

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

let server;
let sellerToken;
let vendorToken;
let testProductSku = `TEST-SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
let testPoId;

const logStep = (name) => {
  console.log(`\x1b[34m[TEST STEP]\x1b[0m ${name}...`);
};

const assertCondition = (condition, errorMessage) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${errorMessage}`);
  }
};

const runTests = async () => {
  try {
    // 1. API Docs Swagger Endpoint check
    logStep("1. Checking Swagger UI API Docs");
    const docsRes = await axios.get(`${BASE_URL}/api-docs`);
    assertCondition(docsRes.status === 200, "Swagger docs should load successfully.");

    // 2. Authentication Registration
    logStep("2. Registering Seller with License ID");
    const sellerRegRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: `seller_${Math.random().toString(36).substring(2, 6)}@test.com`,
      password: "password123",
      role: "Selling Place",
      companyName: "Test Store Inc.",
      userName: "Store Manager",
      phone: "1234567890",
      address: "100 Retail Plaza",
      licenseNo: "LIC-SELLER-999"
    });
    assertCondition(sellerRegRes.status === 201, "Seller registration should succeed.");
    assertCondition(sellerRegRes.data.user.role === "Selling Place", "User role should be Selling Place.");

    logStep("3. Registering Vendor with License ID");
    const vendorEmail = `vendor_${Math.random().toString(36).substring(2, 6)}@test.com`;
    const vendorRegRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: vendorEmail,
      password: "password123",
      role: "Vendor",
      companyName: "Nexus Distributors Ltd.",
      userName: "Alex Vendor",
      phone: "9876543210",
      address: "500 Logistics Way",
      licenseNo: "LIC-VENDOR-888"
    });
    assertCondition(vendorRegRes.status === 201, "Vendor registration should succeed.");
    const vendorId = vendorRegRes.data.user.uid;

    // 3. Login & JWT Validation
    logStep("4. Logging in as Seller");
    const sellerLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: sellerRegRes.data.user.email,
      password: "password123"
    });
    assertCondition(sellerLoginRes.status === 200, "Seller login should succeed.");
    sellerToken = sellerLoginRes.data.token;
    assertCondition(!!sellerToken, "Seller token should be returned.");

    logStep("5. Logging in as Vendor");
    const vendorLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: vendorEmail,
      password: "password123"
    });
    assertCondition(vendorLoginRes.status === 200, "Vendor login should succeed.");
    vendorToken = vendorLoginRes.data.token;

    // 4. Products CRUD catalog
    logStep("6. Creating product in Catalog");
    const sellerHeader = { headers: { Authorization: `Bearer ${sellerToken}` } };
    const vendorHeader = { headers: { Authorization: `Bearer ${vendorToken}` } };

    const prodRes = await axios.post(`${BASE_URL}/api/products`, {
      name: "Organic Whole Milk",
      sku: testProductSku,
      price: 4.50,
      category: "Dairy & Alternatives",
      vendorId: vendorId,
      vendorName: "Nexus Distributors Ltd.",
      description: "Organic whole pasture milk, 1 Gallon jugs."
    }, sellerHeader);
    assertCondition(prodRes.status === 201, "Product registration should succeed.");
    assertCondition(prodRes.data.sku === testProductSku, "SKU should match.");

    logStep("7. Fetching Catalog list");
    const catalogRes = await axios.get(`${BASE_URL}/api/products`, sellerHeader);
    assertCondition(catalogRes.status === 200, "Should load catalog.");
    const foundProd = catalogRes.data.find(p => p.sku === testProductSku);
    assertCondition(!!foundProd, "Created product should be present in catalog list.");

    // 5. Inventory and Batch mappings
    logStep("8. Fetching Inventory list & checking schema fields");
    const invRes = await axios.get(`${BASE_URL}/api/inventory`, sellerHeader);
    assertCondition(invRes.status === 200, "Should load inventory list.");
    const invItem = invRes.data.find(i => i.sku === testProductSku);
    assertCondition(!!invItem, "Inventory record should exist.");
    assertCondition(invItem.availableQty === 0, "Initial availableQty should be 0.");
    assertCondition(invItem.totalQty === 0, "Initial totalQty should be 0.");

    logStep("9. Updating Inventory levels");
    const updateInvRes = await axios.put(`${BASE_URL}/api/inventory/${testProductSku}`, {
      stock: 30,
      reorderPoint: 10,
      averageDailySales: 2.0,
      standardDeviation: 1.0,
      leadTimeDays: 4
    }, sellerHeader);
    assertCondition(updateInvRes.status === 200, "Should update inventory metrics.");
    assertCondition(updateInvRes.data.availableQty === 30, "availableQty should update to 30.");
    assertCondition(updateInvRes.data.totalQty === 30, "totalQty should update to 30.");

    logStep("10. Registering product batch");
    const batchRes = await axios.post(`${BASE_URL}/api/batches`, {
      batchNo: `B-${testProductSku}`,
      itemNbr: testProductSku,
      mfgDate: "2026-07-10",
      expDate: "2026-10-10"
    }, sellerHeader);
    assertCondition(batchRes.status === 201, "Batch status creation should succeed.");

    logStep("11. Connecting Vendor-status link");
    const linkRes = await axios.post(`${BASE_URL}/api/vendor-status`, {
      vendorNo: vendorId,
      vendorName: "Nexus Distributors Ltd.",
      itemNbr: testProductSku,
      sellerId: sellerRegRes.data.user.uid
    }, sellerHeader);
    assertCondition(linkRes.status === 201, "Vendor status link should succeed.");

    // 6. POS Checkout and Deductions
    logStep("12. Executing POS Checkout transaction");
    const saleCheckoutRes = await axios.post(`${BASE_URL}/api/sales`, {
      items: [
        {
          productId: testProductSku,
          quantity: 5,
          price: 4.50
        }
      ]
    }, sellerHeader);
    assertCondition(saleCheckoutRes.status === 201, "Checkout should succeed.");

    logStep("13. Checking stock deduction counters");
    const postSaleInvRes = await axios.get(`${BASE_URL}/api/inventory`, sellerHeader);
    const postSaleItem = postSaleInvRes.data.find(i => i.sku === testProductSku);
    assertCondition(postSaleItem.availableQty === 25, "availableQty should decrement by 5 (30 -> 25).");
    assertCondition(postSaleItem.soldQty === 5, "soldQty should increment to 5.");
    assertCondition(postSaleItem.totalQty === 30, "totalQty should remain 30.");

    // 7. Purchase Order Replenishments
    logStep("14. Creating replenishment Purchase Order");
    const poRes = await axios.post(`${BASE_URL}/api/purchase-orders`, {
      vendorId: vendorId,
      vendorName: "Nexus Distributors Ltd.",
      items: [
        {
          productId: testProductSku,
          productName: "Organic Whole Milk",
          quantity: 20,
          price: 3.50
        }
      ]
    }, sellerHeader);
    assertCondition(poRes.status === 201, "PO creation should succeed.");
    testPoId = poRes.data.id;

    logStep("15. Vendor completes Purchase Order delivery");
    const completePoRes = await axios.put(`${BASE_URL}/api/purchase-orders/${testPoId}/status`, {
      status: "Completed"
    }, sellerHeader); // Complete is called by Selling Place (retailer)
    assertCondition(completePoRes.status === 200, "PO status update to Completed should succeed.");

    logStep("16. Checking replenishment stock increment");
    const postPoInvRes = await axios.get(`${BASE_URL}/api/inventory`, sellerHeader);
    const postPoItem = postPoInvRes.data.find(i => i.sku === testProductSku);
    assertCondition(postPoItem.availableQty === 45, "availableQty should increase by 20 (25 -> 45).");
    assertCondition(postPoItem.totalQty === 50, "totalQty should increase by 20 (30 -> 50).");

    // 8. Proxy Endpoints checks
    logStep("17. Verifying analytics proxy fallback handlers");
    const insightsProxyRes = await axios.post(`${BASE_URL}/api/analytics/expiry-insights`, {
      expiring_batches: [{ batchNo: `B-${testProductSku}`, daysLeft: 12 }]
    }, sellerHeader);
    assertCondition(insightsProxyRes.status === 200, "Expiry-insights proxy should return a response.");
    assertCondition(!!insightsProxyRes.data.markdown_suggestion, "Markdown suggestions should be returned.");

    console.log("\x1b[32m[INTEGRATION TEST SUCCESS] All checks completed successfully with zero regressions.\x1b[0m");
    cleanupAndExit(0);
  } catch (err) {
    console.error("\x1b[31m[INTEGRATION TEST FAILED]\x1b[0m", err.response?.data?.error || err.message);
    cleanupAndExit(1);
  }
};

const cleanupAndExit = (code) => {
  if (server) {
    server.close(() => {
      console.log("Test server stopped.");
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
};

// Start Express server on test port
server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}...`);
  runTests();
});
