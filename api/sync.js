// ===================================================
// API: SYNC ALL (Fetch entire store dataset for logged-in user)
// GET /api/sync
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

    // Fetch all resources in parallel for user's phone
    const [productsRes, customersRes, salesRes, settingsRes] = await Promise.all([
      pool.query('SELECT * FROM products WHERE owner_phone = $1 ORDER BY created_at DESC', [phone]),
      pool.query('SELECT * FROM customers WHERE owner_phone = $1 ORDER BY created_at DESC', [phone]),
      pool.query('SELECT * FROM sales WHERE owner_phone = $1 ORDER BY date DESC', [phone]),
      pool.query('SELECT * FROM settings WHERE owner_phone = $1', [phone])
    ]);

    // Format products
    const products = productsRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price || 0),
      stock: parseInt(row.stock || 0, 10),
      image: row.image || null,
      createdAt: row.created_at
    }));

    // Format customers
    const customers = customersRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      address: row.address || '',
      createdAt: row.created_at
    }));

    // Format sales
    const sales = salesRes.rows.map(row => ({
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

    // Format settings
    const settingsRow = settingsRes.rows[0];
    const settings = settingsRow ? {
      storeName: settingsRow.store_name || '',
      ownerName: settingsRow.owner_name || '',
      address: settingsRow.address || '',
      phone: settingsRow.phone || ''
    } : {
      storeName: (user.name ? user.name + ' Store' : 'Amrut Enterprise'),
      ownerName: user.name || '',
      address: '',
      phone: user.phone || ''
    };

    return sendJSON(res, 200, {
      success: true,
      user: {
        phone: user.phone,
        name: user.name
      },
      data: {
        products,
        customers,
        sales,
        settings
      }
    });
  } catch (err) {
    console.error('Sync error:', err);
    return sendJSON(res, 500, { error: err.message || 'Server error syncing data' });
  }
};
