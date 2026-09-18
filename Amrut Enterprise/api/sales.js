// ===================================================
// API: SALES CRUD (Scoped to authenticated user)
// /api/sales
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

    // --- GET ALL SALES ---
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM sales WHERE owner_phone = $1 ORDER BY date DESC',
        [phone]
      );
      const sales = result.rows.map(row => ({
        id: row.id,
        invoiceNo: row.invoice_no,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        customerAddress: row.customer_address,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
        total: parseFloat(row.total || 0),
        status: row.status || 'Pending',
        paymentStatus: row.payment_status || row.status || 'Pending',
        returnedAmount: parseFloat(row.returned_amount || 0),
        returnStatus: row.return_status || null,
        date: row.date
      }));
      return sendJSON(res, 200, { success: true, sales });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // --- POST (CREATE SALE OR BULK SAVE) ---
    if (req.method === 'POST') {
      if (Array.isArray(body.sales)) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM sales WHERE owner_phone = $1', [phone]);
          for (const s of body.sales) {
            await client.query(
              `INSERT INTO sales (
                id, owner_phone, invoice_no, customer_id, customer_name,
                customer_phone, customer_address, items, total,
                status, payment_status, returned_amount, return_status, date, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
              [
                s.id || Date.now().toString(),
                phone,
                s.invoiceNo || 'INV-' + s.id,
                s.customerId || null,
                s.customerName || 'General',
                s.customerPhone || '',
                s.customerAddress || '',
                JSON.stringify(s.items || []),
                parseFloat(s.total || 0),
                s.status || s.paymentStatus || 'Pending',
                s.paymentStatus || s.status || 'Pending',
                parseFloat(s.returnedAmount || 0),
                s.returnStatus || null,
                s.date || new Date().toISOString(),
                new Date().toISOString()
              ]
            );
          }
          await client.query('COMMIT');
          return sendJSON(res, 200, { success: true, message: 'Sales saved successfully' });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      // Single Sale Creation
      const {
        id, invoiceNo, customerId, customerName, customerPhone, customerAddress,
        items, total, status, paymentStatus, returnedAmount, returnStatus, date
      } = body;

      const saleId = id || Date.now().toString();
      const finalStatus = paymentStatus || status || 'Pending';

      const insertResult = await pool.query(
        `INSERT INTO sales (
          id, owner_phone, invoice_no, customer_id, customer_name,
          customer_phone, customer_address, items, total,
          status, payment_status, returned_amount, return_status, date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id) DO UPDATE SET
          invoice_no = EXCLUDED.invoice_no,
          customer_id = EXCLUDED.customer_id,
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          customer_address = EXCLUDED.customer_address,
          items = EXCLUDED.items,
          total = EXCLUDED.total,
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          returned_amount = EXCLUDED.returned_amount,
          return_status = EXCLUDED.return_status,
          date = EXCLUDED.date
        RETURNING *`,
        [
          saleId,
          phone,
          invoiceNo || 'INV-' + saleId,
          customerId || null,
          customerName || 'General',
          customerPhone || '',
          customerAddress || '',
          JSON.stringify(items || []),
          parseFloat(total || 0),
          finalStatus,
          finalStatus,
          parseFloat(returnedAmount || 0),
          returnStatus || null,
          date || new Date().toISOString()
        ]
      );

      const row = insertResult.rows[0];
      return sendJSON(res, 201, {
        success: true,
        sale: {
          id: row.id,
          invoiceNo: row.invoice_no,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerAddress: row.customer_address,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          total: parseFloat(row.total || 0),
          status: row.status,
          paymentStatus: row.payment_status,
          returnedAmount: parseFloat(row.returned_amount || 0),
          returnStatus: row.return_status,
          date: row.date
        }
      });
    }

    // --- PUT (UPDATE SALE / TOGGLE STATUS / RETURNS) ---
    if (req.method === 'PUT') {
      const {
        id, status, paymentStatus, items, total, returnedAmount, returnStatus
      } = body;

      if (!id) {
        return sendJSON(res, 400, { error: 'Sale ID is required for update.' });
      }

      const updateResult = await pool.query(
        `UPDATE sales
         SET status = COALESCE($1, status),
             payment_status = COALESCE($2, payment_status),
             items = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE items END,
             total = COALESCE($4, total),
             returned_amount = COALESCE($5, returned_amount),
             return_status = COALESCE($6, return_status)
         WHERE id = $7 AND owner_phone = $8
         RETURNING *`,
        [
          status,
          paymentStatus || status,
          items ? JSON.stringify(items) : null,
          total !== undefined ? parseFloat(total) : null,
          returnedAmount !== undefined ? parseFloat(returnedAmount) : null,
          returnStatus,
          id,
          phone
        ]
      );

      if (updateResult.rows.length === 0) {
        return sendJSON(res, 404, { error: 'Sale not found or not owned by user.' });
      }

      const row = updateResult.rows[0];
      return sendJSON(res, 200, {
        success: true,
        sale: {
          id: row.id,
          invoiceNo: row.invoice_no,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerAddress: row.customer_address,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          total: parseFloat(row.total || 0),
          status: row.status,
          paymentStatus: row.payment_status,
          returnedAmount: parseFloat(row.returned_amount || 0),
          returnStatus: row.return_status,
          date: row.date
        }
      });
    }

    // --- DELETE SALE ---
    if (req.method === 'DELETE') {
      const id = body.id || req.query.id;
      if (!id) {
        return sendJSON(res, 400, { error: 'Sale ID is required for deletion.' });
      }

      await pool.query('DELETE FROM sales WHERE id = $1 AND owner_phone = $2', [id, phone]);
      return sendJSON(res, 200, { success: true, message: 'Sale deleted successfully' });
    }

    return sendJSON(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Sales API error:', err);
    return sendJSON(res, 500, { error: err.message || 'Error processing sales request' });
  }
};
