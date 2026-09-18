// ===================================================
// API: AUTH LOGIN (Phone Number + Password Login)
// POST /api/auth/login
// Body: { phone, password }
// ===================================================

const { getPool, initDB, hashPassword, verifyPassword, generateToken, sendJSON } = require('../_db');

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
    let { phone, password } = body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return sendJSON(res, 400, { error: 'Phone number is required.' });
    }

    if (!password || typeof password !== 'string') {
      return sendJSON(res, 400, { error: 'Password is required.' });
    }

    phone = phone.trim();

    const pool = getPool();

    // Check if user exists
    const userResult = await pool.query('SELECT phone, name, password FROM users WHERE phone = $1', [phone]);

    if (userResult.rows.length === 0) {
      return sendJSON(res, 401, { error: 'Invalid phone or password.' });
    }

    const user = userResult.rows[0];

    // If user exists but hasn't set password yet (legacy account), set password upon first login
    if (!user.password) {
      const hashedPassword = hashPassword(password);
      await pool.query('UPDATE users SET password = $1, last_login = NOW() WHERE phone = $2', [hashedPassword, phone]);
    } else {
      // Verify password
      const isMatch = verifyPassword(password, user.password);
      if (!isMatch) {
        return sendJSON(res, 401, { error: 'Invalid phone or password.' });
      }
      await pool.query('UPDATE users SET last_login = NOW() WHERE phone = $1', [phone]);
    }

    const token = generateToken(user);

    return sendJSON(res, 200, {
      success: true,
      message: 'Logged in successfully',
      user: {
        phone: user.phone,
        name: user.name
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return sendJSON(res, 500, { error: err.message || 'Internal server error during login.' });
  }
};
