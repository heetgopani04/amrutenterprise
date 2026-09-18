// ==========================================
// STORAGE MODULE - Backend API Client (Neon Postgres) + In-Memory State
// ==========================================

const API_BASE = '/api';

const AUTH_KEYS = {
  TOKEN: 'amrut_auth_token',
  USER: 'amrut_auth_user',
  CACHE_PRODUCTS: 'amrut_cache_products',
  CACHE_CUSTOMERS: 'amrut_cache_customers',
  CACHE_SALES: 'amrut_cache_sales',
  CACHE_SETTINGS: 'amrut_cache_settings'
};

const Storage = {
  // In-memory cache for instant synchronous UI rendering
  cache: {
    products: [],
    customers: [],
    sales: [],
    settings: {
      storeName: 'Amrut Enterprise',
      ownerName: '',
      address: '',
      phone: ''
    }
  },

  // ----------------------------------------------------
  // AUTHENTICATION METHODS
  // ----------------------------------------------------
  getToken() {
    return localStorage.getItem(AUTH_KEYS.TOKEN) || null;
  },

  getUser() {
    try {
      const u = localStorage.getItem(AUTH_KEYS.USER);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  isLoggedIn() {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user && user.phone);
  },

  async login(phone, name = '') {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, name })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sign in. Please try again.');
      }

      localStorage.setItem(AUTH_KEYS.TOKEN, data.token);
      localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));

      // Fetch all store data from Neon DB
      await this.fetchAll();

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  },

  logout() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.USER);
    localStorage.removeItem(AUTH_KEYS.CACHE_PRODUCTS);
    localStorage.removeItem(AUTH_KEYS.CACHE_CUSTOMERS);
    localStorage.removeItem(AUTH_KEYS.CACHE_SALES);
    localStorage.removeItem(AUTH_KEYS.CACHE_SETTINGS);

    this.cache = {
      products: [],
      customers: [],
      sales: [],
      settings: {
        storeName: 'Amrut Enterprise',
        ownerName: '',
        address: '',
        phone: ''
      }
    };
  },

  // Helper for authenticated fetch headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const user = this.getUser();
    if (user && user.phone) {
      headers['x-user-phone'] = user.phone;
    }
    return headers;
  },

  // ----------------------------------------------------
  // BULK SYNC / INITIAL DATA LOAD
  // ----------------------------------------------------
  async fetchAll() {
    if (!this.isLoggedIn()) return;

    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (res.status === 401) {
        this.logout();
        window.location.reload();
        return;
      }

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        this.cache.products = json.data.products || [];
        this.cache.customers = json.data.customers || [];
        this.cache.sales = json.data.sales || [];
        this.cache.settings = json.data.settings || this.cache.settings;

        // Persist offline cache backup
        this.saveToLocalCache();
      }
    } catch (err) {
      console.warn('Backend sync failed, falling back to local cache:', err);
      this.loadFromLocalCache();
    }
  },

  loadFromLocalCache() {
    try {
      const p = localStorage.getItem(AUTH_KEYS.CACHE_PRODUCTS);
      const c = localStorage.getItem(AUTH_KEYS.CACHE_CUSTOMERS);
      const s = localStorage.getItem(AUTH_KEYS.CACHE_SALES);
      const st = localStorage.getItem(AUTH_KEYS.CACHE_SETTINGS);

      if (p) this.cache.products = JSON.parse(p);
      if (c) this.cache.customers = JSON.parse(c);
      if (s) this.cache.sales = JSON.parse(s);
      if (st) this.cache.settings = JSON.parse(st);
    } catch (e) {
      console.error('Error loading offline cache:', e);
    }
  },

  saveToLocalCache() {
    try {
      localStorage.setItem(AUTH_KEYS.CACHE_PRODUCTS, JSON.stringify(this.cache.products));
      localStorage.setItem(AUTH_KEYS.CACHE_CUSTOMERS, JSON.stringify(this.cache.customers));
      localStorage.setItem(AUTH_KEYS.CACHE_SALES, JSON.stringify(this.cache.sales));
      localStorage.setItem(AUTH_KEYS.CACHE_SETTINGS, JSON.stringify(this.cache.settings));
    } catch (e) {
      console.error('Error writing local cache:', e);
    }
  },

  // ----------------------------------------------------
  // 1. PRODUCTS
  // ----------------------------------------------------
  getProducts() {
    return this.cache.products || [];
  },

  saveProducts(products) {
    this.cache.products = products;
    this.saveToLocalCache();

    // Async push to Neon Postgres
    fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ products })
    }).catch(err => console.error('Failed to sync products to database:', err));

    return true;
  },

  async deleteProductServer(id) {
    this.cache.products = this.cache.products.filter(p => p.id !== id);
    this.saveToLocalCache();

    try {
      await fetch(`${API_BASE}/products`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      return true;
    } catch (err) {
      console.error('Error deleting product from database:', err);
      return false;
    }
  },

  // ----------------------------------------------------
  // 2. CUSTOMERS
  // ----------------------------------------------------
  getCustomers() {
    return this.cache.customers || [];
  },

  saveCustomers(customers) {
    this.cache.customers = customers;
    this.saveToLocalCache();

    // Async push to Neon Postgres
    fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ customers })
    }).catch(err => console.error('Failed to sync customers to database:', err));

    return true;
  },

  async deleteCustomerServer(id) {
    this.cache.customers = this.cache.customers.filter(c => c.id !== id);
    this.saveToLocalCache();

    try {
      await fetch(`${API_BASE}/customers`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      return true;
    } catch (err) {
      console.error('Error deleting customer from database:', err);
      return false;
    }
  },

  // ----------------------------------------------------
  // 3. SALES
  // ----------------------------------------------------
  getSales() {
    return this.cache.sales || [];
  },

  saveSales(sales) {
    this.cache.sales = sales;
    this.saveToLocalCache();

    // Async push to Neon Postgres
    fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ sales })
    }).catch(err => console.error('Failed to sync sales to database:', err));

    return true;
  },

  // ----------------------------------------------------
  // 4. STORE SETTINGS
  // ----------------------------------------------------
  getSettings() {
    return this.cache.settings || {
      storeName: 'Amrut Enterprise',
      ownerName: '',
      address: '',
      phone: ''
    };
  },

  saveSettings(settings) {
    this.cache.settings = settings;
    this.saveToLocalCache();

    // Async push to Neon Postgres
    fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(settings)
    }).catch(err => console.error('Failed to sync settings to database:', err));

    return true;
  },

  // ----------------------------------------------------
  // 5. RESET ALL DATA
  // ----------------------------------------------------
  async resetAllData() {
    try {
      await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch (err) {
      console.error('Error sending reset request:', err);
    }

    this.cache = {
      products: [],
      customers: [],
      sales: [],
      settings: {
        storeName: 'Amrut Enterprise',
        ownerName: '',
        address: '',
        phone: ''
      }
    };
    this.saveToLocalCache();
    return true;
  }
};

window.Storage = Storage;
