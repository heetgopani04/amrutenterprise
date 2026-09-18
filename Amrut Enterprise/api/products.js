// ===================================================
// API: PRODUCTS CRUD (Scoped to authenticated user)
// /api/products
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

    // --- GET ALL PRODUCTS ---
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM products WHERE owner_phone = $1 ORDER BY created_at DESC',
        [phone]
      );
      const products = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        price: parseFloat(row.price || 0),
        stock: parseInt(row.stock || 0, 10),
        image: row.image || null,
        createdAt: row.created_at
      }));
      return sendJSON(res, 200, { success: true, products });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // --- POST (CREATE OR BULK SAVE PRODUCTS) ---
    if (req.method === 'POST') {
      // Check if body is an array (bulk sync) or single object
      if (Array.isArray(body.products)) {
        // Bulk replace/upsert
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM products WHERE owner_phone = $1', [phone]);
          for (const p of body.products) {
            await client.query(
              `INSERT INTO products (id, owner_phone, name, category, price, stock, image, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                p.id || Date.now().toString(),
                phone,
                p.name,
                p.category || 'General',
                parseFloat(p.price || 0),
                parseInt(p.stock || 0, 10),
                p.image || null,
                p.createdAt || new Date().toISOString()
              ]
            );
          }
          await client.query('COMMIT');
          return sendJSON(res, 200, { success: true, message: 'Products saved successfully' });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      // Single Product Creation
      const { id, name, category, price, stock, image, createdAt } = body;
      if (!name) {
        return sendJSON(res, 400, { error: 'Product name is required.' });
      }

      const prodId = id || Date.now().toString();
      const insertResult = await pool.query(
        `INSERT INTO products (id, owner_phone, name, category, price, stock, image, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           price = EXCLUDED.price,
           stock = EXCLUDED.stock,
           image = EXCLUDED.image,
           updated_at = NOW()
         RETURNING *`,
        [
          prodId,
          phone,
          name,
          category || 'General',
          parseFloat(price || 0),
          parseInt(stock || 0, 10),
          image || null,
          createdAt || new Date().toISOString()
        ]
      );

      const saved = insertResult.rows[0];
      return sendJSON(res, 201, {
        success: true,
        product: {
          id: saved.id,
          name: saved.name,
          category: saved.category,
          price: parseFloat(saved.price || 0),
          stock: parseInt(saved.stock || 0, 10),
          image: saved.image,
          createdAt: saved.created_at
        }
      });
    }

    // --- PUT (UPDATE PRODUCT) ---
    if (req.method === 'PUT') {
      const { id, name, category, price, stock, image } = body;
      if (!id) {
        return sendJSON(res, 400, { error: 'Product ID is required for update.' });
      }

      const updateResult = await pool.query(
        `UPDATE products
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             price = COALESCE($3, price),
             stock = COALESCE($4, stock),
             image = $5,
             updated_at = NOW()
         WHERE id = $6 AND owner_phone = $7
         RETURNING *`,
        [
          name,
          category,
          price !== undefined ? parseFloat(price) : null,
          stock !== undefined ? parseInt(stock, 10) : null,
          image,
          id,
          phone
        ]
      );

      if (updateResult.rows.length === 0) {
        return sendJSON(res, 404, { error: 'Product not found or not owned by user.' });
      }

      const updated = updateResult.rows[0];
      return sendJSON(res, 200, {
        success: true,
        product: {
          id: updated.id,
          name: updated.name,
          category: updated.category,
          price: parseFloat(updated.price || 0),
          stock: parseInt(updated.stock || 0, 10),
          image: updated.image,
          createdAt: updated.created_at
        }
      });
    }

    // --- DELETE PRODUCT ---
    if (req.method === 'DELETE') {
      const id = body.id || req.query.id;
      if (!id) {
        return sendJSON(res, 400, { error: 'Product ID is required for deletion.' });
      }

      await pool.query('DELETE FROM products WHERE id = $1 AND owner_phone = $2', [id, phone]);
      return sendJSON(res, 200, { success: true, message: 'Product deleted successfully' });
    }

    return sendJSON(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Products API error:', err);
    return sendJSON(res, 500, { error: err.message || 'Error processing products request' });
  }
};
