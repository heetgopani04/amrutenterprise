// ===================================================
// API: CUSTOMERS CRUD (Scoped to authenticated user)
// /api/customers
// Methods: GET, POST, PUT, DELETE
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

    // --- GET ALL CUSTOMERS ---
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM customers WHERE owner_phone = $1 ORDER BY created_at DESC',
        [phone]
      );
      const customers = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        address: row.address || '',
        createdAt: row.created_at
      }));
      return sendJSON(res, 200, { success: true, customers });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // --- POST (CREATE OR BULK SAVE) ---
    if (req.method === 'POST') {
      if (Array.isArray(body.customers)) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM customers WHERE owner_phone = $1', [phone]);
          for (const c of body.customers) {
            await client.query(
              `INSERT INTO customers (id, owner_phone, name, phone, address, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                c.id || Date.now().toString(),
                phone,
                c.name,
                c.phone || '',
                c.address || '',
                c.createdAt || new Date().toISOString()
              ]
            );
          }
          await client.query('COMMIT');
          return sendJSON(res, 200, { success: true, message: 'Customers saved successfully' });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      const { id, name, phone: custPhone, address, createdAt } = body;
      if (!name) {
        return sendJSON(res, 400, { error: 'Customer name is required.' });
      }

      const custId = id || Date.now().toString();
      const insertResult = await pool.query(
        `INSERT INTO customers (id, owner_phone, name, phone, address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address
         RETURNING *`,
        [
          custId,
          phone,
          name,
          custPhone || '',
          address || '',
          createdAt || new Date().toISOString()
        ]
      );

      const saved = insertResult.rows[0];
      return sendJSON(res, 201, {
        success: true,
        customer: {
          id: saved.id,
          name: saved.name,
          phone: saved.phone,
          address: saved.address,
          createdAt: saved.created_at
        }
      });
    }

    // --- PUT (UPDATE CUSTOMER) ---
    if (req.method === 'PUT') {
      const { id, name, phone: custPhone, address } = body;
      if (!id) {
        return sendJSON(res, 400, { error: 'Customer ID is required for update.' });
      }

      const updateResult = await pool.query(
        `UPDATE customers
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             address = COALESCE($3, address)
         WHERE id = $4 AND owner_phone = $5
         RETURNING *`,
        [name, custPhone, address, id, phone]
      );

      if (updateResult.rows.length === 0) {
        return sendJSON(res, 404, { error: 'Customer not found or not owned by user.' });
      }

      const updated = updateResult.rows[0];
      return sendJSON(res, 200, {
        success: true,
        customer: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          createdAt: updated.created_at
        }
      });
    }

    // --- DELETE CUSTOMER ---
    if (req.method === 'DELETE') {
      const id = body.id || req.query.id;
      if (!id) {
        return sendJSON(res, 400, { error: 'Customer ID is required for deletion.' });
      }

      await pool.query('DELETE FROM customers WHERE id = $1 AND owner_phone = $2', [id, phone]);
      return sendJSON(res, 200, { success: true, message: 'Customer deleted successfully' });
    }

    return sendJSON(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Customers API error:', err);
    return sendJSON(res, 500, { error: err.message || 'Error processing customers request' });
  }
};
