const express = require('express');
const router = express.Router();
const axios = require('axios');
const { db } = require('../config/firebase');
const { authenticateToken } = require('../middleware/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

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
    salesByDate[dateStr] = (salesByDate[dateStr] || 0) + sale.subtotal;
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
    
    const response = await axios.post(`${AI_SERVICE_URL}/forecast/demand`, {
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
    
    const response = await axios.post(`${AI_SERVICE_URL}/predict/sales`, {
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

    const response = await axios.post(`${AI_SERVICE_URL}/optimize/inventory`, {
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
    const response = await axios.post(`${AI_SERVICE_URL}/recommendations`, {
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
      const response = await axios.post(`${AI_SERVICE_URL}/insights`, {
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
    const response = await axios.post(`${AI_SERVICE_URL}/expiry-insights`, req.body);
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
    const response = await axios.post(`${AI_SERVICE_URL}/forecast`, req.body);
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

module.exports = router;
