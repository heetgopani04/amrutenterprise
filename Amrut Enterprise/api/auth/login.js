// ===================================================
// API: AUTH LOGIN (Simple Phone Number Identifier Login)
// POST /api/auth/login
// Body: { phone, name }
// ===================================================

const { getPool, initDB, generateToken, sendJSON } = require('../_db');

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
    let { phone, name } = body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return sendJSON(res, 400, { error: 'Phone number is required to sign in.' });
    }

    phone = phone.trim();
    name = (name && typeof name === 'string') ? name.trim() : null;

    const pool = getPool();

    // Check if user already exists
    const userResult = await pool.query('SELECT phone, name FROM users WHERE phone = $1', [phone]);

    let user;
    if (userResult.rows.length === 0) {
      // First-time login: create new user
      const finalName = name || 'Store Owner';
      const insertResult = await pool.query(
        'INSERT INTO users (phone, name, last_login) VALUES ($1, $2, NOW()) RETURNING phone, name',
        [phone, finalName]
      );
      user = insertResult.rows[0];

      // Auto-initialize default settings for new user
      await pool.query(
        `INSERT INTO settings (owner_phone, store_name, owner_name, phone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (owner_phone) DO NOTHING`,
        [phone, finalName + ' Store', finalName, phone]
      );
    } else {
      // Existing user: update last_login (and optionally name if provided)
      user = userResult.rows[0];
      if (name && (!user.name || user.name === 'Store Owner')) {
        const updateResult = await pool.query(
          'UPDATE users SET name = $1, last_login = NOW() WHERE phone = $2 RETURNING phone, name',
          [name, phone]
        );
        user = updateResult.rows[0];
      } else {
        await pool.query('UPDATE users SET last_login = NOW() WHERE phone = $1', [phone]);
      }
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
    return sendJSON(res, 500, { error: err.message || 'Internal server error during login' });
  }
};
