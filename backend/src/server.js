const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { isMock } = require('./config/firebase');

const axios = require('axios');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const poRoutes = require('./routes/purchaseOrders');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const batchesRoutes = require('./routes/batches');
const vendorStatusRoutes = require('./routes/vendorStatus');

const app = express();
const PORT = process.env.PORT || 5002;
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all client links
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Retail Intelligence & Vendor Analytics API Documentation',
    version: '1.0.0',
    description: 'Central Node.js/Express API layer connected with Firebase and local FastAPI service.',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pass your Firebase (or Mock) ID Token as Bearer <token>',
      },
    },
  },
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'], // Scan routes for JSDoc documentation tags
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Bind Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/vendor-status', vendorStatusRoutes);

// AI Service proxy endpoints
app.post('/api/ocr/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const base64Image = req.file.buffer.toString('base64');
    const aiServiceUrl = process.env.AI_SERVICE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/python` : 'http://127.0.0.1:8000');
    
    const response = await axios.post(`${aiServiceUrl}/ocr/scan`, {
      image: base64Image,
      mime_type: req.file.mimetype
    }, {
      headers: {
        'Authorization': req.headers['authorization'] || '',
        'cookie': req.headers['cookie'] || '',
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error forwarding OCR scan to AI service:', err.message);
    res.status(500).json({ error: 'AI Service OCR scanner is offline.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/python` : 'http://127.0.0.1:8000');
    const response = await axios.post(`${aiServiceUrl}/chat`, req.body, {
      headers: {
        'Authorization': req.headers['authorization'] || '',
        'cookie': req.headers['cookie'] || '',
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
      },
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'text/plain');
    response.data.pipe(res);
  } catch (err) {
    console.error('Error proxying chat stream to AI service:', err.message);
    res.status(500).write('Greetings! I am Retail Intel\'s AI Assistant. Ask me about low stock alerts, product expiry dates, or vendor contacts.');
    res.end();
  }
});

// Root Index route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    project: 'Retail Intelligence & Vendor Analytics Platform',
    databaseMode: isMock ? 'Local Persistent JSON Emulator' : 'Firebase Firestore Live Cloud',
    apiDocs: `http://localhost:${PORT}/api-docs`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Express API Server running at http://localhost:${PORT}`);
    console.log(`Interactive API Docs available at http://localhost:${PORT}/api-docs`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const ALT_PORT = 5002;
      console.log(`Port ${PORT} is in use. Falling back to port ${ALT_PORT}...`);
      app.listen(ALT_PORT, () => {
        console.log(`Express API Server running at http://localhost:${ALT_PORT}`);
        console.log(`Interactive API Docs available at http://localhost:${ALT_PORT}/api-docs`);
      });
    } else {
      console.error('Server startup error:', err);
    }
  });
}

module.exports = app;
