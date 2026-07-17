const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { isMock } = require('./config/firebase');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const poRoutes = require('./routes/purchaseOrders');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

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
app.listen(PORT, () => {
  console.log(`Express API Server running at http://localhost:${PORT}`);
  console.log(`Interactive API Docs available at http://localhost:${PORT}/api-docs`);
});
