const express = require('express');
const router = express.Router();
const axios = require('axios');
const { db } = require('../config/firebase');
const { authenticateToken } = require('../middleware/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/python` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/python` : 'http://127.0.0.1:8000'));

const callAiService = async (req, endpoint, data) => {
  return await axios.post(`${AI_SERVICE_URL}${endpoint}`, data, {
    headers: {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
    }
  });
};

const getSalesTrendForProduct = async (productId) => {
  const salesSnapshot = await db.collection('sales_table')
    .where('transactionType', '==', 'item_sale')
    .where('productId', '==', productId)
    .get();

  if (salesSnapshot.empty) {
    return [0, 0, 0];
  }

  const salesByDate = {};
  salesSnapshot.docs.forEach(doc => {
    const sale = doc.data();
    const dateStr = sale.createdAt ? sale.createdAt.substring(0, 10) : '2026-07-17';
    salesByDate[dateStr] = (salesByDate[dateStr] || 0) + (sale.subtotal || 0);
  });

  const sortedRevenue = Object.keys(salesByDate)
    .sort()
    .map(date => salesByDate[date]);

  while (sortedRevenue.length < 3) {
    sortedRevenue.unshift(0);
  }
  return sortedRevenue.slice(-5);
};

/**
 * @swagger
 * /api/analytics/forecast-demand:
 *   post:
 *     summary: Forecast demand for a product based on historical sales
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *               periods: { type: integer, default: 3 }
 *     responses:
 *       200:
 *         description: Predicted demand
 */
router.post('/forecast-demand', authenticateToken, async (req, res) => {
  const { productId, periods = 3 } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const history = await getSalesTrendForProduct(productId);
    
    const response = await callAiService(req, '/forecast/demand', {
      sales_history: history,
      periods
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service forecast:', err.message);
    res.json({ forecast: [10, 12, 15].slice(0, periods), fallback: true });
  }
});

/**
 * @swagger
 * /api/analytics/predict-sales:
 *   post:
 *     summary: Predict sales for the next 30 days
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *               days: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: 30 day daily sales prediction
 */
router.post('/predict-sales', authenticateToken, async (req, res) => {
  const { productId, days = 30 } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const history = await getSalesTrendForProduct(productId);
    
    const response = await callAiService(req, '/predict/sales', {
      sales_history: history,
      days
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service predict:', err.message);
    const fallbackPredictions = Array.from({ length: days }, (_, i) => 10 + Math.sin(i) * 2);
    res.json({ predictions: fallbackPredictions, fallback: true });
  }
});

/**
 * @swagger
 * /api/analytics/optimize-inventory:
 *   post:
 *     summary: Calculate safety stock and Economic Order Quantity
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *     responses:
 *       200:
 *         description: Optimized stock variables
 */
router.post('/optimize-inventory', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const invDoc = await db.collection('inventory').doc(productId).get();
    if (!invDoc.exists) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }
    const inv = invDoc.data();

    const response = await callAiService(req, '/optimize/inventory', {
      average_daily_sales: inv.averageDailySales || 1.0,
      lead_time_days: inv.leadTimeDays || 5,
      standard_deviation: inv.standardDeviation || 1.0,
      service_level_factor: 1.65,
      holding_cost: 2.0,
      ordering_cost: 50.0
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service optimize:', err.message);
    res.json({
      safety_stock: 5,
      reorder_point: 15,
      economic_order_quantity: 50,
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/recommendations:
 *   post:
 *     summary: Get complementary product recommendations
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productName]
 *             properties:
 *               productName: { type: string }
 *     responses:
 *       200:
 *         description: List of recommended products
 */
router.post('/recommendations', authenticateToken, async (req, res) => {
  const { productName } = req.body;
  if (!productName) {
    return res.status(400).json({ error: 'productName is required' });
  }

  try {
    const response = await callAiService(req, '/recommendations', {
      product_id: productName,
      limit: 3
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service recommendations:', err.message);
    res.json({
      recommendations: [
        { product_id: 'rec_paper_towels', name: 'Paper Towels Roll', confidence: 0.65 }
      ],
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/insights:
 *   get:
 *     summary: Retrieve AI insights and warnings for the user
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Actionable business insights list
 */
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    let invQuery = db.collection('inventory');
    if (req.user.role === 'Selling Place') {
      invQuery = invQuery.where('sellingPlaceId', '==', req.user.uid);
    } else {
      invQuery = invQuery.where('vendorId', '==', req.user.uid);
    }

    const invSnapshot = await invQuery.get();
    if (invSnapshot.empty) {
      return res.json({ insights: [{ type: 'info', message: 'Add products and checkouts to see insights.' }] });
    }

    const inventoryItems = [];
    const salesTrends = [];

    for (const doc of invSnapshot.docs) {
      const inv = doc.data();
      inventoryItems.push({
        product_id: doc.id,
        name: inv.productName,
        stock: inv.stock,
        reorder_point: inv.reorderPoint,
        average_daily_sales: inv.averageDailySales
      });

      const trend = await getSalesTrendForProduct(doc.id);
      salesTrends.push({
        product_id: doc.id,
        name: inv.productName,
        revenue_history: trend
      });
    }

    let insights = [];
    try {
      const response = await callAiService(req, '/insights', {
        inventory_items: inventoryItems,
        sales_trends: salesTrends
      });
      insights = response.data.insights;
    } catch (err) {
      console.error('Error calling AI Service insights endpoint:', err.message);
      inventoryItems.forEach(item => {
        if (item.stock <= item.reorder_point) {
          insights.push({
            type: 'warning',
            product_id: item.product_id,
            message: `WARNING (Local): '${item.name}' is low on stock (${item.stock}/${item.reorder_point}). Consider restock.`
          });
        }
      });
      if (insights.length === 0) {
        insights.push({ type: 'info', message: 'Heuristics check: Inventory levels appear normal.' });
      }
    }

    const insightsPayload = {
      userId: req.user.uid,
      insights,
      createdAt: new Date().toISOString()
    };
    await db.collection('aiInsights').doc(req.user.uid).set(insightsPayload);

    res.json(insightsPayload);
  } catch (err) {
    console.error('Error fetching analytics insights:', err);
    res.status(500).json({ error: 'Failed to compile AI business insights' });
  }
});

/**
 * @swagger
 * /api/analytics/expiry-insights:
 *   post:
 *     summary: Retrieve markdown discount suggestions for expiring batches
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.post('/expiry-insights', authenticateToken, async (req, res) => {
  try {
    const response = await callAiService(req, '/expiry-insights', req.body);
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service expiry insights:', err.message);
    res.json({
      markdown_suggestion: "### Markdown Promotion Strategy (Fallback)\n- **Item Alert**: Expiring batch detected.\n- **Promo**: Apply 30% markdown for quick sale.\n- **Placement**: Place on front-end endcaps."
    });
  }
});

/**
 * @swagger
 * /api/analytics/event-forecast:
 *   post:
 *     summary: Zero-shot event demand forecasting classification
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.post('/event-forecast', authenticateToken, async (req, res) => {
  try {
    const response = await callAiService(req, '/forecast', req.body);
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service event-forecast:', err.message);
    res.json({
      item_nbr: req.body.item_nbr,
      multiplier: 1.25,
      adjustment_reason: "Rule-based fallback: Upcoming seasonal events trigger +25% stock buffer."
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NEW ML ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/analytics/cost-prediction:
 *   get:
 *     summary: Forecast procurement/shop costs for next 14 days using exponential smoothing
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/cost-prediction', authenticateToken, async (req, res) => {
  try {
    // Pull completed purchase orders for cost history
    let poQuery = db.collection('purchaseOrders').where('status', '==', 'Completed');
    if (req.user.role === 'Selling Place') {
      poQuery = db.collection('purchaseOrders')
        .where('sellingPlaceId', '==', req.user.uid)
        .where('status', '==', 'Completed');
    } else if (req.user.role === 'Vendor') {
      poQuery = db.collection('purchaseOrders')
        .where('vendorId', '==', req.user.uid)
        .where('status', '==', 'Completed');
    }

    const poSnapshot = await poQuery.get();
    const pos = poSnapshot.docs.map(d => d.data());

    // Build daily cost timeline from POs
    const costByDate = {};
    pos.forEach(po => {
      const dateStr = (po.createdAt || po.updatedAt || '').substring(0, 10);
      if (dateStr) {
        const amount = po.totalAmount || po.items?.reduce((s, i) => s + (i.quantity * i.price), 0) || 0;
        costByDate[dateStr] = (costByDate[dateStr] || 0) + amount;
      }
    });

    const sortedDates = Object.keys(costByDate).sort();
    let dailyCosts = sortedDates.map(d => costByDate[d]);

    // Fallback synthetic cost history if sparse data
    if (dailyCosts.length < 5) {
      dailyCosts = [285, 310, 275, 340, 295, 380, 320, 355, 300, 410, 285, 360, 290, 420];
    }

    const response = await callAiService(req, '/predict/cost', {
      daily_costs: dailyCosts,
      periods: 14
    });

    res.json({ ...response.data, dates: sortedDates });
  } catch (err) {
    console.error('Error calling AI Service cost prediction:', err.message);
    const fallback = [285, 310, 275, 340, 295, 380, 320, 355, 300, 410, 285, 360, 290, 420];
    res.json({
      history: fallback,
      forecast: [318, 325, 312, 340, 330, 348, 355, 342, 360, 368, 345, 372, 358, 380],
      periods: 14,
      mean_cost: 325,
      std_cost: 42,
      budget_threshold: 388,
      trend: 'rising',
      slope_per_day: 2.1,
      overrun_alert_days: [9, 12, 14],
      total_forecast_cost: 4853,
      insight: 'Procurement costs are rising. Estimated spend over next 14 days: $4,853. ⚠️ Budget threshold exceeded on 3 day(s).',
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/abc-xyz:
 *   get:
 *     summary: ABC/XYZ inventory classification by revenue and demand variability
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/abc-xyz', authenticateToken, async (req, res) => {
  try {
    let invQuery = db.collection('inventory');
    if (req.user.role === 'Selling Place') {
      invQuery = invQuery.where('sellingPlaceId', '==', req.user.uid);
    } else {
      invQuery = invQuery.where('vendorId', '==', req.user.uid);
    }
    const invSnapshot = await invQuery.get();

    // Get prices from item_list
    const itemListSnapshot = await db.collection('item_list').get();
    const priceMap = {};
    itemListSnapshot.docs.forEach(doc => { priceMap[doc.id] = doc.data().sellingPrice || doc.data().price || 0; });

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

    const response = await callAiService(req, '/classify/abc-xyz', {
      inventory_items: items
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service abc-xyz:', err.message);
    res.json({
      classifications: [
        { productId: 'SKU-GROC-009', name: 'Basmati Rice 5kg', abc_class: 'A', xyz_class: 'Y', combined: 'AY', revenue_contribution: 790.12, cumulative_pct: 28.4, coefficient_of_variation: 0.329 },
        { productId: 'SKU-GROC-010', name: 'Refined Sunflower Oil 1L', abc_class: 'A', xyz_class: 'Y', combined: 'AY', revenue_contribution: 716.80, cumulative_pct: 54.2, coefficient_of_variation: 0.352 },
        { productId: 'SKU-BAKE-003', name: 'Whole Wheat Bread 400g', abc_class: 'B', xyz_class: 'Y', combined: 'BY', revenue_contribution: 472.35, cumulative_pct: 71.2, coefficient_of_variation: 0.368 },
        { productId: 'SKU-DAIRY-001', name: 'Full Cream Milk 1L', abc_class: 'B', xyz_class: 'X', combined: 'BX', revenue_contribution: 330.78, cumulative_pct: 83.1, coefficient_of_variation: 0.346 },
        { productId: 'SKU-SNAC-005', name: 'Classic Potato Chips 150g', abc_class: 'C', xyz_class: 'Z', combined: 'CZ', revenue_contribution: 214.43, cumulative_pct: 90.8, coefficient_of_variation: 0.472 }
      ],
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/ghost-skus:
 *   get:
 *     summary: Detect dead-stock ghost SKUs with zero sales velocity
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/ghost-skus', authenticateToken, async (req, res) => {
  try {
    let invQuery = db.collection('inventory');
    if (req.user.role === 'Selling Place') {
      invQuery = invQuery.where('sellingPlaceId', '==', req.user.uid);
    } else {
      invQuery = invQuery.where('vendorId', '==', req.user.uid);
    }
    const invSnapshot = await invQuery.get();

    const items = invSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        productId: doc.id,
        name: d.productName || d.name || '',
        soldQty: d.soldQty || 0,
        availableQty: d.availableQty || d.stock || 0,
        averageDailySales: d.averageDailySales || 0,
        updatedAt: d.updatedAt || new Date().toISOString(),
        reorderPoint: d.reorderPoint || 10
      };
    });

    const response = await callAiService(req, '/detect/ghost-skus', {
      inventory_items: items,
      idle_days_threshold: 30
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service ghost-skus:', err.message);
    res.json({
      ghost_skus: [{ productId: 'SKU-HYSE-008', name: 'Toothpaste Whitening 100g', available_qty: 70, sold_qty: 0, idle_days: 33, risk_score: 86.0, is_ghost: true, recommendation: '🔴 DEAD STOCK: Consider deep discount, bundling, or return to supplier.' }],
      healthy_skus: [],
      ghost_count: 1,
      total_dead_stock_units: 70,
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/stockout-risk:
 *   get:
 *     summary: Per-SKU stockout risk scoring with days-remaining and estimated stockout date
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/stockout-risk', authenticateToken, async (req, res) => {
  try {
    let invQuery = db.collection('inventory');
    if (req.user.role === 'Selling Place') {
      invQuery = invQuery.where('sellingPlaceId', '==', req.user.uid);
    } else {
      invQuery = invQuery.where('vendorId', '==', req.user.uid);
    }
    const invSnapshot = await invQuery.get();

    const items = invSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        productId: doc.id,
        name: d.productName || d.name || '',
        availableQty: d.availableQty || d.stock || 0,
        averageDailySales: d.averageDailySales || 1.0,
        leadTimeDays: d.leadTimeDays || 5,
        reorderPoint: d.reorderPoint || 10,
        standardDeviation: d.standardDeviation || 1.0
      };
    });

    const response = await callAiService(req, '/analyze/stockout-risk', {
      inventory_items: items
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service stockout-risk:', err.message);
    res.json({
      stockout_risks: [],
      critical_count: 0,
      warning_count: 0,
      safe_count: 0,
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/vendor-scores:
 *   get:
 *     summary: Vendor performance leaderboard with fulfillment, volume, and reliability scores
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/vendor-scores', authenticateToken, async (req, res) => {
  try {
    const poSnapshot = await db.collection('purchaseOrders').get();
    const salesSnapshot = await db.collection('sales_table')
      .where('transactionType', '==', 'item_sale').get();
    const vendorsSnapshot = await db.collection('vendors').get();

    const pos = poSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const sales = salesSnapshot.docs.map(d => d.data());
    const vendors = vendorsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Group POs by vendor
    const vendorPoMap = {};
    pos.forEach(po => {
      const vid = po.vendorId;
      if (!vendorPoMap[vid]) vendorPoMap[vid] = [];
      vendorPoMap[vid].push(po);
    });

    // Group sales volume by vendor
    const vendorVolumeMap = {};
    sales.forEach(s => {
      const vid = s.vendorId;
      if (vid) vendorVolumeMap[vid] = (vendorVolumeMap[vid] || 0) + (s.quantity || 1);
    });

    const vendorList = vendors.map(v => ({
      vendorId: v.id,
      vendorName: v.companyName || v.vendorName || 'Vendor',
      purchase_orders: vendorPoMap[v.id] || [],
      sales_volume: vendorVolumeMap[v.id] || 0
    })).filter(v => v.purchase_orders.length > 0 || v.sales_volume > 0);

    if (vendorList.length === 0) {
      // synthetic fallback
      return res.json({
        vendor_scores: [
          { vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.', score: 87.5, tier: '🥇 Gold', fulfillment_rate: 100, rejection_rate: 0, total_pos: 4, completed_pos: 4, total_volume_supplied: 310, breakdown: { fulfillment_score: 50, volume_score: 30, reliability_score: 20 } },
          { vendorId: 'VENDOR-APEX-002', vendorName: 'Apex Distributions', score: 72.0, tier: '🥈 Silver', fulfillment_rate: 100, rejection_rate: 0, total_pos: 2, completed_pos: 2, total_volume_supplied: 160, breakdown: { fulfillment_score: 50, volume_score: 22, reliability_score: 20 } }
        ],
        fallback: true
      });
    }

    const response = await callAiService(req, '/score/vendors', {
      vendors: vendorList
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service vendor-scores:', err.message);
    res.json({
      vendor_scores: [
        { vendorId: 'VENDOR-NEXUS-001', vendorName: 'Nexus Distributors Ltd.', score: 87.5, tier: '🥇 Gold', fulfillment_rate: 100, rejection_rate: 0, total_pos: 4, completed_pos: 4, total_volume_supplied: 310, breakdown: { fulfillment_score: 50, volume_score: 30, reliability_score: 20 } }
      ],
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/margin-health:
 *   get:
 *     summary: Gross margin per SKU with alerts for low/critical margins
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/margin-health', authenticateToken, async (req, res) => {
  try {
    let invQuery = db.collection('inventory');
    if (req.user.role === 'Selling Place') {
      invQuery = invQuery.where('sellingPlaceId', '==', req.user.uid);
    } else {
      invQuery = invQuery.where('vendorId', '==', req.user.uid);
    }
    const invSnapshot = await invQuery.get();

    // Get product prices from item_list
    const itemListSnapshot = await db.collection('item_list').get();
    const priceMap = {};
    itemListSnapshot.docs.forEach(doc => {
      priceMap[doc.id] = doc.data().price || 0;
    });

    const products = invSnapshot.docs.map(doc => {
      const d = doc.data();
      const pid = doc.id;
      return {
        productId: pid,
        name: d.productName || d.name || '',
        price: priceMap[pid] || d.price || 0,
        unitCost: d.unitCost || 0,
        soldQty: d.soldQty || 0
      };
    });

    const response = await callAiService(req, '/analyze/margin-health', {
      products
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service margin-health:', err.message);
    res.json({
      margin_health: [
        { productId: 'SKU-DAIRY-001', name: 'Full Cream Milk 1L', selling_price: 2.99, unit_cost: 1.80, margin_pct: 39.8, gross_profit: 87.94, units_sold: 74, status: '✅ Healthy', alert: false },
        { productId: 'SKU-DAIRY-002', name: 'Salted Butter 500g', selling_price: 4.25, unit_cost: 2.60, margin_pct: 38.8, gross_profit: 36.30, units_sold: 22, status: '✅ Healthy', alert: false },
        { productId: 'SKU-BAKE-003', name: 'Whole Wheat Bread 400g', selling_price: 3.49, unit_cost: 2.10, margin_pct: 39.8, gross_profit: 75.06, units_sold: 54, status: '✅ Healthy', alert: false },
        { productId: 'SKU-BEVE-004', name: 'Orange Juice 1L', selling_price: 3.75, unit_cost: 2.20, margin_pct: 41.3, gross_profit: 48.05, units_sold: 31, status: '✅ Healthy', alert: false },
        { productId: 'SKU-SNAC-005', name: 'Classic Potato Chips 150g', selling_price: 1.99, unit_cost: 1.10, margin_pct: 44.7, gross_profit: 33.82, units_sold: 38, status: '✅ Healthy', alert: false },
        { productId: 'SKU-GROC-009', name: 'Basmati Rice 5kg', selling_price: 8.99, unit_cost: 5.50, margin_pct: 38.8, gross_profit: 307.12, units_sold: 88, status: '✅ Healthy', alert: false }
      ],
      alerts: [],
      avg_margin_pct: 40.5,
      total_gross_profit: 588.29,
      fallback: true
    });
  }
});

/**
 * @swagger
 * /api/analytics/sales-anomalies:
 *   get:
 *     summary: Z-score based sales anomaly detection per SKU
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/sales-anomalies', authenticateToken, async (req, res) => {
  try {
    let salesQuery = db.collection('sales_table').where('transactionType', '==', 'item_sale');
    if (req.user.role === 'Selling Place') {
      salesQuery = db.collection('sales_table')
        .where('transactionType', '==', 'item_sale')
        .where('sellingPlaceId', '==', req.user.uid);
    } else {
      salesQuery = db.collection('sales_table')
        .where('transactionType', '==', 'item_sale')
        .where('vendorId', '==', req.user.uid);
    }

    const salesSnapshot = await salesQuery.get();
    const sales = salesSnapshot.docs.map(d => d.data());

    // Build daily sales series per product
    const productSalesMap = {};
    sales.forEach(s => {
      const pid = s.productId || s.itemNbr;
      const name = s.productName || pid;
      const date = (s.createdAt || s.timestamp || '').substring(0, 10);
      if (!pid || !date) return;
      if (!productSalesMap[pid]) productSalesMap[pid] = { productId: pid, name, dates: {}, totalQtyByDate: {} };
      productSalesMap[pid].totalQtyByDate[date] = (productSalesMap[pid].totalQtyByDate[date] || 0) + (s.quantity || 0);
    });

    const salesSeries = Object.values(productSalesMap).map(p => {
      const sortedDates = Object.keys(p.totalQtyByDate).sort();
      const dailySales = sortedDates.map(d => p.totalQtyByDate[d]);
      return { productId: p.productId, name: p.name, daily_sales: dailySales };
    }).filter(s => s.daily_sales.length >= 5);

    if (salesSeries.length === 0) {
      return res.json({ anomalies: [], normal: [], anomaly_count: 0, spike_count: 0, crash_count: 0, fallback: true });
    }

    const response = await callAiService(req, '/detect/sales-anomalies', {
      sales_series: salesSeries
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service sales-anomalies:', err.message);
    res.json({ anomalies: [], normal: [], anomaly_count: 0, spike_count: 0, crash_count: 0, fallback: true });
  }
});

/**
 * @swagger
 * /api/analytics/risk-matrix:
 *   post:
 *     summary: Comprehensive multi-dimensional risk matrix for all inventory items
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.post('/risk-matrix', authenticateToken, async (req, res) => {
  try {
    let invQuery = db.collection('inventory');
    if (req.user.role === 'Selling Place') {
      invQuery = invQuery.where('sellingPlaceId', '==', req.user.uid);
    } else {
      invQuery = invQuery.where('vendorId', '==', req.user.uid);
    }

    const invSnapshot = await invQuery.get();
    const batchSnapshot = await db.collection('batch_status').get();

    // Get prices from item_list
    const itemListSnapshot = await db.collection('item_list').get();
    const priceMap = {};
    itemListSnapshot.docs.forEach(doc => { priceMap[doc.id] = doc.data().price || 0; });

    const inventoryItems = invSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        productId: doc.id,
        productName: d.productName || d.name || '',
        category: d.category || '',
        availableQty: d.availableQty || d.stock || 0,
        soldQty: d.soldQty || 0,
        averageDailySales: d.averageDailySales || 0.1,
        leadTimeDays: d.leadTimeDays || 5,
        standardDeviation: d.standardDeviation || 1.0,
        reorderPoint: d.reorderPoint || 10,
        price: priceMap[doc.id] || d.price || 0,
        unitCost: d.unitCost || 0,
        updatedAt: d.updatedAt || new Date().toISOString()
      };
    });

    const batchItems = batchSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        batchNo: doc.id,
        productId: d.productId || d.itemNbr || '',
        expDate: d.expDate || '2099-01-01',
        mfgDate: d.mfgDate || '',
        quantity: d.quantity || 0
      };
    });

    const response = await callAiService(req, '/analyze/risk-matrix', {
      inventory_items: inventoryItems,
      sales_items: [],
      batch_items: batchItems
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI Service risk-matrix:', err.message);
    res.json({
      risk_breakdown: [],
      store_risk_score: 0,
      critical_count: 0,
      warning_count: 0,
      safe_count: 0,
      total_cash_tied_up: 0,
      fallback: true
    });
  }
});

module.exports = router;
