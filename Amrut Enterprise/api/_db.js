// ===================================================
// BACKEND DB HELPER - Postgres (Neon) Connection & Auth
// ===================================================

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'amrut-enterprise-secret-key-2026-neon-db';

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please add it to your Vercel Environment Variables.');
    }
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Ensure database tables exist (auto-migration on cold start)
let tablesInitialized = false;

async function initDB() {
  if (tablesInitialized) return;

  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        phone VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        owner_phone VARCHAR(50) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        price NUMERIC(12, 2) DEFAULT 0,
        stock INTEGER DEFAULT 0,
        image TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(100) PRIMARY KEY,
        owner_phone VARCHAR(50) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(100) PRIMARY KEY,
        owner_phone VARCHAR(50) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
        invoice_no VARCHAR(100),
        customer_id VARCHAR(100),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        items JSONB DEFAULT '[]'::jsonb,
        total NUMERIC(12, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending',
        payment_status VARCHAR(50) DEFAULT 'Pending',
        returned_amount NUMERIC(12, 2) DEFAULT 0,
        return_status VARCHAR(50),
        date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        owner_phone VARCHAR(50) PRIMARY KEY REFERENCES users(phone) ON DELETE CASCADE,
        store_name VARCHAR(255),
        owner_name VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_phone);
      CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_phone);
      CREATE INDEX IF NOT EXISTS idx_sales_owner ON sales(owner_phone);
    `);
    tablesInitialized = true;
  } finally {
    client.release();
  }
}

// Generate JWT token for user session
function generateToken(user) {
  return jwt.sign(
    { phone: user.phone, name: user.name },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}

// Verify token and authenticate request
async function authenticateUser(req) {
  await initDB();

  let token = null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Fallback to custom header or query param if provided
  const headerPhone = req.headers['x-user-phone'];

  let decoded = null;
  if (token) {
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // If token is invalid or expired, check headerPhone
      decoded = null;
    }
  }

  const phone = (decoded && decoded.phone) || headerPhone;
  if (!phone) {
    return null;
  }

  // Query user from db
  const pool = getPool();
  const res = await pool.query('SELECT phone, name FROM users WHERE phone = $1', [phone.trim()]);
  if (res.rows.length === 0) {
    // If not found in DB but phone is provided, create the user record
    const insertRes = await pool.query(
      'INSERT INTO users (phone, name) VALUES ($1, $2) RETURNING phone, name',
      [phone.trim(), (decoded && decoded.name) || 'Store Owner']
    );
    return insertRes.rows[0];
  }

  return res.rows[0];
}

// Set CORS and JSON headers helper
function sendJSON(res, statusCode, data) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-phone'
  );
  
  if (res.status) {
    return res.status(statusCode).json(data);
  } else {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  }
}

module.exports = {
  getPool,
  initDB,
  generateToken,
  authenticateUser,
  sendJSON
};
