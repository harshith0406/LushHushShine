const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config();

let db;
let auth;
let isMock = false;

// Path to save mock Firestore collections
const DATA_DIR = process.env.VERCEL || process.env.AWS_REGION ? '/tmp/data' : path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure mock collection files exist
const initMockFile = (colName) => {
  const filePath = path.join(DATA_DIR, `${colName}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}));
  }
  return filePath;
};

// --- Mock Firestore Emulator Implementation ---
class MockDocRef {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
    this.filePath = initMockFile(collectionName);
  }

  async get() {
    const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    const docData = data[this.id];
    return {
      id: this.id,
      exists: !!docData,
      data: () => docData || null
    };
  }

  async set(content, options = {}) {
    const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    if (options.merge && data[this.id]) {
      data[this.id] = { ...data[this.id], ...content };
    } else {
      data[this.id] = content;
    }
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    return { id: this.id };
  }

  async update(content) {
    const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    if (!data[this.id]) {
      throw new Error(`Document with ID ${this.id} does not exist in collection ${this.collectionName}`);
    }
    data[this.id] = { ...data[this.id], ...content };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    return { id: this.id };
  }

  async delete() {
    const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    if (data[this.id]) {
      delete data[this.id];
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
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
    const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
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
    // Set timestamp if requested
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
    // A simple verify token mechanism
    if (!token) throw new Error('No token provided');
    const users = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    
    // In mock mode, we assume the token is the user's email or UID
    const uid = token.replace('mock-token-', '');
    const user = users[uid];
    if (!user) {
      // Fallback: check if the token matches an email address
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
    const filePath = initMockFile('login_credentials');
    const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    users[uid] = {
      uid,
      email: properties.email,
      displayName: properties.displayName || '',
      phoneNumber: properties.phoneNumber || '',
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    return users[uid];
  }
}

// --- Initialize Real Firebase or Mock ---
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
    console.log('Successfully initialized real Firebase Admin SDK.');
  } catch (error) {
    console.error('Failed to initialize real Firebase Admin SDK. Falling back to local Mock Firestore.', error.message);
    isMock = true;
    db = new MockFirestoreDb();
    auth = new MockAuth();
  }
} else {
  console.log('Firebase configuration not found. Initializing persistent local Mock Firestore database...');
  isMock = true;
  db = new MockFirestoreDb();
  auth = new MockAuth();
}

module.exports = {
  db,
  auth,
  isMock
};
