// ===================================================
// API: SETTINGS (Store Profile scoped to authenticated user)
// /api/settings
// Methods: GET, POST, PUT
// ===================================================

const { getPool, authenticateUser, sendJSON } = require('./_db');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, { ok: true });
  }

  try {
    const user = await authenticateUser(req);
    if (!user) {
      return sendJSON(res, 401, { error: 'Unauthorized. Please login.' });
    }

    const pool = getPool();
    const phone = user.phone;

    // --- GET SETTINGS ---
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM settings WHERE owner_phone = $1', [phone]);
      if (result.rows.length === 0) {
        return sendJSON(res, 200, {
          success: true,
          settings: {
            storeName: user.name ? user.name + ' Store' : 'Amrut Enterprise',
            ownerName: user.name || '',
            address: '',
            phone: user.phone || ''
          }
        });
      }

      const row = result.rows[0];
      return sendJSON(res, 200, {
        success: true,
        settings: {
          storeName: row.store_name || '',
          ownerName: row.owner_name || '',
          address: row.address || '',
          phone: row.phone || ''
        }
      });
    }

    // --- SAVE / UPDATE SETTINGS ---
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { storeName, ownerName, address, phone: storePhone } = body;

      const result = await pool.query(
        `INSERT INTO settings (owner_phone, store_name, owner_name, address, phone, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (owner_phone) DO UPDATE SET
           store_name = EXCLUDED.store_name,
           owner_name = EXCLUDED.owner_name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           updated_at = NOW()
         RETURNING *`,
        [phone, storeName || '', ownerName || '', address || '', storePhone || phone]
      );

      const row = result.rows[0];
      return sendJSON(res, 200, {
        success: true,
        settings: {
          storeName: row.store_name,
          ownerName: row.owner_name,
          address: row.address,
          phone: row.phone
        }
      });
    }

    return sendJSON(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Settings API error:', err);
    return sendJSON(res, 500, { error: err.message || 'Error processing settings request' });
  }
};
