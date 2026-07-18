const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config();

let db;
let auth;
let isMock = false;

const SOURCE_DATA_DIR = path.join(__dirname, '../../data');
const DATA_DIR = process.env.VERCEL || process.env.AWS_REGION ? '/tmp/data' : SOURCE_DATA_DIR;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In Vercel, copy pre-filled Read-Only JSON files into the writable /tmp directory on cold start
if ((process.env.VERCEL || process.env.AWS_REGION) && fs.existsSync(SOURCE_DATA_DIR)) {
  const files = fs.readdirSync(SOURCE_DATA_DIR);
  for (const file of files) {
    const destFile = path.join(DATA_DIR, file);
    if (!fs.existsSync(destFile)) {
      fs.copyFileSync(path.join(SOURCE_DATA_DIR, file), destFile);
    }
  }
}

// Ensure mock collection files exist
const initMockFile = (colName) => {
  const filePath = path.join(DATA_DIR, `${colName}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}));
  }
  return filePath;
};

const COLLECTIONS = [
  'batch_status', 'inventory', 'item_list', 'login_credentials', 
  'notifications', 'products', 'purchaseOrders', 'sales', 
  'sales_table', 'sellingPlaces', 'users', 'vendor_status', 'vendors'
];

let edgeConfigSynced = false;

const syncEdgeConfig = async () => {
  if (edgeConfigSynced) return;
  if (!process.env.EDGE_CONFIG) {
    edgeConfigSynced = true;
    return;
  }
  
  try {
    console.log('Detected Vercel Edge Config. Syncing database collections...');
    const axios = require('axios');
    const response = await axios.get(process.env.EDGE_CONFIG, { timeout: 5000 });
    const store = response.data.items || response.data;
    
    if (store && typeof store === 'object') {
      for (const colName of COLLECTIONS) {
        if (store[colName]) {
          const filePath = path.join(DATA_DIR, `${colName}.json`);
          fs.writeFileSync(filePath, JSON.stringify(store[colName], null, 2));
          console.log(`Successfully synced collection '${colName}' from Vercel Edge Config.`);
        }
      }
    }
    edgeConfigSynced = true;
  } catch (error) {
    console.error('Failed to sync from Vercel Edge Config, using local mock data fallback:', error.message);
    edgeConfigSynced = true;
  }
};

let kvClient;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  try {
    const { createClient } = require('@vercel/kv');
    kvClient = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log('Successfully initialized Vercel KV client.');
  } catch (err) {
    console.error('Failed to initialize Vercel KV client:', err.message);
  }
}

let kvSeeded = false;

const autoSeedKV = async () => {
  if (kvSeeded) return;
  if (!kvClient) {
    kvSeeded = true;
    return;
  }
  
  try {
    const hasInventory = await kvClient.exists('col:inventory');
    if (hasInventory) {
      kvSeeded = true;
      return;
    }
    
    console.log('Vercel KV database is empty. Auto-seeding mock data collections...');
    for (const colName of COLLECTIONS) {
      const filePath = path.join(SOURCE_DATA_DIR, `${colName}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        await kvClient.set(`col:${colName}`, data);
        console.log(`Successfully seeded '${colName}' to Vercel KV.`);
      }
    }
    console.log('Vercel KV database successfully seeded.');
    kvSeeded = true;
  } catch (error) {
    console.error('Failed to auto-seed Vercel KV:', error.message);
    kvSeeded = true;
  }
};

const getCollectionData = async (colName, filePath) => {
  if (kvClient) {
    await autoSeedKV();
    const data = await kvClient.get(`col:${colName}`);
    return data || {};
  }
  await syncEdgeConfig();
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const setCollectionData = async (colName, data, filePath) => {
  if (kvClient) {
    await autoSeedKV();
    await kvClient.set(`col:${colName}`, data);
  } else {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
};

// --- Mock Firestore Emulator Implementation ---
class MockDocRef {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
    this.filePath = initMockFile(collectionName);
  }

  async get() {
    const data = await getCollectionData(this.collectionName, this.filePath);
    const docData = data[this.id];
    return {
      id: this.id,
      exists: !!docData,
      data: () => docData || null
    };
  }

  async set(content, options = {}) {
    const data = await getCollectionData(this.collectionName, this.filePath);
    if (options.merge && data[this.id]) {
      data[this.id] = { ...data[this.id], ...content };
    } else {
      data[this.id] = content;
    }
    await setCollectionData(this.collectionName, data, this.filePath);
    return { id: this.id };
  }

  async update(content) {
    const data = await getCollectionData(this.collectionName, this.filePath);
    if (!data[this.id]) {
      throw new Error(`Document with ID ${this.id} does not exist in collection ${this.collectionName}`);
    }
    data[this.id] = { ...data[this.id], ...content };
    await setCollectionData(this.collectionName, data, this.filePath);
    return { id: this.id };
  }

  async delete() {
    const data = await getCollectionData(this.collectionName, this.filePath);
    if (data[this.id]) {
      delete data[this.id];
      await setCollectionData(this.collectionName, data, this.filePath);
    }
    return { success: true };
  }
}

class MockQuery {
  constructor(collectionName, filters = [], sortField = null, sortDir = 'asc', limitVal = null) {
    this.collectionName = collectionName;
    this.filePath = initMockFile(collectionName);
    this.filters = filters;
    this.sortField = sortField;
    this.sortDir = sortDir;
    this.limitVal = limitVal;
  }

  where(field, op, value) {
    const newFilters = [...this.filters, { field, op, value }];
    return new MockQuery(this.collectionName, newFilters, this.sortField, this.sortDir, this.limitVal);
  }

  orderBy(field, dir = 'asc') {
    return new MockQuery(this.collectionName, this.filters, field, dir, this.limitVal);
  }

  limit(num) {
    return new MockQuery(this.collectionName, this.filters, this.sortField, this.sortDir, num);
  }

  async get() {
    const data = await getCollectionData(this.collectionName, this.filePath);
    let docs = Object.keys(data).map(id => ({
      id,
      ...data[id]
    }));

    // Apply filters
    for (const filter of this.filters) {
      const { field, op, value } = filter;
      docs = docs.filter(doc => {
        const val = doc[field];
        if (op === '==') return val === value;
        if (op === '!=') return val !== value;
        if (op === '>') return val > value;
        if (op === '>=') return val >= value;
        if (op === '<') return val < value;
        if (op === '<=') return val <= value;
        if (op === 'array-contains') return Array.isArray(val) && val.includes(value);
        if (op === 'in') return Array.isArray(value) && value.includes(val);
        return true;
      });
    }

    // Apply sorting
    if (this.sortField) {
      docs.sort((a, b) => {
        const valA = a[this.sortField];
        const valB = b[this.sortField];
        if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitVal) {
      docs = docs.slice(0, this.limitVal);
    }

    return {
      docs: docs.map(doc => {
        const { id, ...rest } = doc;
        return {
          id,
          data: () => rest
        };
      }),
      empty: docs.length === 0,
      size: docs.length
    };
  }
}

class MockCollection extends MockQuery {
  doc(id) {
    const docId = id || Math.random().toString(36).substring(2, 15);
    return new MockDocRef(this.collectionName, docId);
  }

  async add(content) {
    const docId = Math.random().toString(36).substring(2, 15);
    const docRef = this.doc(docId);
    const docContent = {
      ...content,
      createdAt: content.createdAt || new Date().toISOString()
    };
    await docRef.set(docContent);
    return {
      id: docId,
      get: () => docRef.get()
    };
  }
}

class MockFirestoreDb {
  collection(name) {
    return new MockCollection(name);
  }
}

// --- Mock Auth Implementation ---
class MockAuth {
  constructor() {
    this.filePath = initMockFile('login_credentials');
  }

  async verifyIdToken(token) {
    if (!token) throw new Error('No token provided');
    const users = await getCollectionData('login_credentials', this.filePath);
    
    const uid = token.replace('mock-token-', '');
    const user = users[uid];
    if (!user) {
      const foundUid = Object.keys(users).find(u => users[u].email === token);
      if (foundUid) {
        return { uid: foundUid, email: users[foundUid].email, ...users[foundUid] };
      }
      throw new Error('Invalid or expired mock token');
    }
    return { uid, email: user.email, ...user };
  }

  async createUser(properties) {
    const uid = properties.uid || Math.random().toString(36).substring(2, 15);
    const users = await getCollectionData('login_credentials', this.filePath);
    users[uid] = {
      uid,
      email: properties.email,
      displayName: properties.displayName || '',
      phoneNumber: properties.phoneNumber || '',
      createdAt: new Date().toISOString()
    };
    await setCollectionData('login_credentials', users, this.filePath);
    return users[uid];
  }
}

// --- Postgres Firestore Emulator Implementation ---
let pgInitialized = false;
let pgInitPromise = null;

const initPostgresDb = async (sql) => {
  console.log('Initializing Postgres tables and seeding if empty...');
  for (const colName of COLLECTIONS) {
    await sql(`CREATE TABLE IF NOT EXISTS "${colName}" (id VARCHAR(255) PRIMARY KEY, data JSONB)`);
    const countRes = await sql(`SELECT COUNT(*) as count FROM "${colName}"`);
    const count = parseInt(countRes[0].count, 10);
    
    if (count === 0) {
      console.log(`Table "${colName}" is empty. Seeding from local JSON file...`);
      const filePath = path.join(SOURCE_DATA_DIR, `${colName}.json`);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
          const dataMap = JSON.parse(fileContent);
          for (const [id, value] of Object.entries(dataMap)) {
            await sql(`INSERT INTO "${colName}" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`, [id, JSON.stringify(value)]);
          }
          console.log(`Seeded ${Object.keys(dataMap).length} records into table "${colName}".`);
        } catch (err) {
          console.error(`Failed to parse/seed "${colName}":`, err.message);
        }
      }
    }
  }
  console.log('Postgres initialization and seeding completed.');
};

const ensurePgInitialized = async (sql) => {
  if (pgInitialized) return;
  if (!pgInitPromise) {
    pgInitPromise = initPostgresDb(sql).then(() => {
      pgInitialized = true;
    }).catch(err => {
      console.error('Failed to initialize Postgres database:', err.message);
      pgInitPromise = null;
      throw err;
    });
  }
  await pgInitPromise;
};

class PostgresDocRef {
  constructor(collectionName, docId, sql) {
    this.collectionName = collectionName;
    this.id = docId;
    this.sql = sql;
  }

  async get() {
    await ensurePgInitialized(this.sql);
    const rows = await this.sql(`SELECT data FROM "${this.collectionName}" WHERE id = $1`, [this.id]);
    const docData = rows.length > 0 ? rows[0].data : null;
    return {
      id: this.id,
      exists: !!docData,
      data: () => docData || null
    };
  }

  async set(content, options = {}) {
    await ensurePgInitialized(this.sql);
    let finalContent = content;
    if (options.merge) {
      const existing = await this.get();
      if (existing.exists) {
        finalContent = { ...existing.data(), ...content };
      }
    }
    await this.sql(
      `INSERT INTO "${this.collectionName}" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`,
      [this.id, JSON.stringify(finalContent)]
    );
    return { id: this.id };
  }

  async update(content) {
    await ensurePgInitialized(this.sql);
    const existing = await this.get();
    if (!existing.exists) {
      throw new Error(`Document with ID ${this.id} does not exist in collection ${this.collectionName}`);
    }
    const finalContent = { ...existing.data(), ...content };
    await this.sql(
      `UPDATE "${this.collectionName}" SET data = $2 WHERE id = $1`,
      [this.id, JSON.stringify(finalContent)]
    );
    return { id: this.id };
  }

  async delete() {
    await ensurePgInitialized(this.sql);
    await this.sql(`DELETE FROM "${this.collectionName}" WHERE id = $1`, [this.id]);
    return { success: true };
  }
}

class PostgresQuery {
  constructor(collectionName, sql, filters = [], sortField = null, sortDir = 'asc', limitVal = null) {
    this.collectionName = collectionName;
    this.sql = sql;
    this.filters = filters;
    this.sortField = sortField;
    this.sortDir = sortDir;
    this.limitVal = limitVal;
  }

  where(field, op, value) {
    const newFilters = [...this.filters, { field, op, value }];
    return new PostgresQuery(this.collectionName, this.sql, newFilters, this.sortField, this.sortDir, this.limitVal);
  }

  orderBy(field, dir = 'asc') {
    return new PostgresQuery(this.collectionName, this.sql, this.filters, field, dir, this.limitVal);
  }

  limit(num) {
    return new PostgresQuery(this.collectionName, this.sql, this.filters, this.sortField, this.sortDir, num);
  }

  async get() {
    await ensurePgInitialized(this.sql);
    const rows = await this.sql(`SELECT id, data FROM "${this.collectionName}"`);
    let docs = rows.map(row => ({
      id: row.id,
      ...row.data
    }));

    // Apply filters
    for (const filter of this.filters) {
      const { field, op, value } = filter;
      docs = docs.filter(doc => {
        const val = doc[field];
        if (op === '==') return val === value;
        if (op === '!=') return val !== value;
        if (op === '>') return val > value;
        if (op === '>=') return val >= value;
        if (op === '<') return val < value;
        if (op === '<=') return val <= value;
        if (op === 'array-contains') return Array.isArray(val) && val.includes(value);
        if (op === 'in') return Array.isArray(value) && value.includes(val);
        return true;
      });
    }

    // Apply sorting
    if (this.sortField) {
      docs.sort((a, b) => {
        const valA = a[this.sortField];
        const valB = b[this.sortField];
        if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitVal) {
      docs = docs.slice(0, this.limitVal);
    }

    return {
      docs: docs.map(doc => {
        const { id, ...rest } = doc;
        return {
          id,
          data: () => rest
        };
      }),
      empty: docs.length === 0,
      size: docs.length
    };
  }
}

class PostgresCollection extends PostgresQuery {
  doc(id) {
    const docId = id || Math.random().toString(36).substring(2, 15);
    return new PostgresDocRef(this.collectionName, docId, this.sql);
  }

  async add(content) {
    const docId = Math.random().toString(36).substring(2, 15);
    const docRef = this.doc(docId);
    const docContent = {
      ...content,
      createdAt: content.createdAt || new Date().toISOString()
    };
    await docRef.set(docContent);
    return {
      id: docId,
      get: () => docRef.get()
    };
  }
}

class PostgresFirestoreDb {
  constructor(sql) {
    this.sql = sql;
  }
  collection(name) {
    return new PostgresCollection(name, this.sql);
  }
}

class PostgresAuth {
  constructor(sql) {
    this.sql = sql;
  }

  async verifyIdToken(token) {
    if (!token) throw new Error('No token provided');
    await ensurePgInitialized(this.sql);
    
    const uid = token.replace('mock-token-', '');
    const rows = await this.sql(`SELECT data FROM "login_credentials" WHERE id = $1`, [uid]);
    if (rows.length > 0) {
      const user = rows[0].data;
      return { uid, email: user.email, ...user };
    }
    
    const allRows = await this.sql(`SELECT id, data FROM "login_credentials"`);
    for (const row of allRows) {
      if (row.data && row.data.email === token) {
        return { uid: row.id, email: row.data.email, ...row.data };
      }
    }
    
    throw new Error('Invalid or expired mock token');
  }

  async createUser(properties) {
    await ensurePgInitialized(this.sql);
    const uid = properties.uid || Math.random().toString(36).substring(2, 15);
    const userData = {
      uid,
      email: properties.email,
      displayName: properties.displayName || '',
      phoneNumber: properties.phoneNumber || '',
      createdAt: new Date().toISOString()
    };
    await this.sql(
      `INSERT INTO "login_credentials" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2`,
      [uid, JSON.stringify(userData)]
    );
    return userData;
  }
}

// --- Initialize Database Connection ---
if (process.env.DATABASE_URL) {
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    db = new PostgresFirestoreDb(sql);
    auth = new PostgresAuth(sql);
    isMock = false;
    console.log('Successfully initialized Neon Postgres (Vercel DB) as real-time database.');
  } catch (error) {
    console.error('Failed to initialize Neon Postgres client. Falling back to Mock Firestore.', error.message);
    isMock = true;
    db = new MockFirestoreDb();
    auth = new MockAuth();
  }
} else {
  const firebaseConfigPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../firebase-service-account.json');

  if (fs.existsSync(firebaseConfigPath) || process.env.FIREBASE_PROJECT_ID) {
    try {
      const config = fs.existsSync(firebaseConfigPath) 
        ? { credential: admin.credential.cert(require(firebaseConfigPath)) }
        : {
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID
          };

      admin.initializeApp(config);
      db = admin.firestore();
      auth = admin.auth();
      isMock = false;
      console.log('Successfully initialized real Firebase Admin SDK.');
    } catch (error) {
      console.error('Failed to initialize real Firebase Admin SDK. Falling back to local Mock Firestore.', error.message);
      isMock = true;
      db = new MockFirestoreDb();
      auth = new MockAuth();
    }
  } else {
    console.log('Firebase and Postgres configurations not found. Initializing persistent local Mock Firestore database...');
    isMock = true;
    db = new MockFirestoreDb();
    auth = new MockAuth();
  }
}

module.exports = {
  db,
  auth,
  isMock
};
