// ===================================================
// API: AUTH SIGNUP (Register new user with Phone + Password)
// POST /api/auth/signup
// Body: { phone, name, password, confirmPassword }
// ===================================================

const { getPool, initDB, hashPassword, generateToken, sendJSON } = require('../_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    await initDB();

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let { phone, name, password, confirmPassword } = body;

    // Validate Phone Number
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return sendJSON(res, 400, { error: 'Phone number is required.' });
    }
    phone = phone.trim();

    // Validate Name
    name = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Store Owner';

    // Validate Password
    if (!password || typeof password !== 'string') {
      return sendJSON(res, 400, { error: 'Password is required.' });
    }
    if (password.length < 6) {
      return sendJSON(res, 400, { error: 'Password must be at least 6 characters long.' });
    }

    // Validate Password Confirmation
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return sendJSON(res, 400, { error: 'Password and Confirm Password do not match.' });
    }

    const pool = getPool();

    // Check if user already exists
    const existing = await pool.query('SELECT phone FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return sendJSON(res, 400, { error: 'An account with this phone number already exists. Please log in.' });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create new user in DB
    const insertResult = await pool.query(
      'INSERT INTO users (phone, name, password, last_login) VALUES ($1, $2, $3, NOW()) RETURNING phone, name',
      [phone, name, hashedPassword]
    );
    const user = insertResult.rows[0];

    // Auto-initialize default store settings for new user
    await pool.query(
      `INSERT INTO settings (owner_phone, store_name, owner_name, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (owner_phone) DO NOTHING`,
      [phone, name + ' Store', name, phone]
    );

    // Generate JWT token
    const token = generateToken(user);

    return sendJSON(res, 201, {
      success: true,
      message: 'Account created successfully',
      user: {
        phone: user.phone,
        name: user.name
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    return sendJSON(res, 500, { error: err.message || 'Internal server error during registration.' });
  }
};
