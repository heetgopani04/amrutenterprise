// ===================================================
// API: AUTH ME (Validate current session token)
// GET /api/auth/me
// ===================================================

const { authenticateUser, sendJSON } = require('../_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, { ok: true });
  }

  try {
    const user = await authenticateUser(req);
    if (!user) {
      return sendJSON(res, 401, { error: 'Unauthorized. Please login again.' });
    }

    return sendJSON(res, 200, {
      success: true,
      user: {
        phone: user.phone,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Auth verification error:', err);
    return sendJSON(res, 500, { error: err.message || 'Server error verifying session' });
  }
};
