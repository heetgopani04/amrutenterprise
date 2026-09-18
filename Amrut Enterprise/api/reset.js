// ===================================================
// API: RESET DATA (Wipe all data for authenticated user only)
// POST /api/reset
// ===================================================

const { getPool, authenticateUser, sendJSON } = require('./_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const user = await authenticateUser(req);
    if (!user) {
      return sendJSON(res, 401, { error: 'Unauthorized. Please login.' });
    }

    const pool = getPool();
    const phone = user.phone;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM products WHERE owner_phone = $1', [phone]);
      await client.query('DELETE FROM customers WHERE owner_phone = $1', [phone]);
      await client.query('DELETE FROM sales WHERE owner_phone = $1', [phone]);
      await client.query('DELETE FROM settings WHERE owner_phone = $1', [phone]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return sendJSON(res, 200, {
      success: true,
      message: 'All store data has been reset successfully for your account.'
    });
  } catch (err) {
    console.error('Reset error:', err);
    return sendJSON(res, 500, { error: err.message || 'Error resetting store data' });
  }
};
