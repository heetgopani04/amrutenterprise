// ==========================================
// DASHBOARD MODULE - Product Grid, Quick Cart & Invoice Creation
// ==========================================

const Dashboard = {
  cart: {}, // { [productId]: quantity }
  customerMode: 'existing', // 'existing' | 'new'
  searchQuery: '',

  init() {
    this.injectStyles();
    this.setupDashboardLayout();
    this.setupModal();
    this.render();
  },

  injectStyles() {
    if (document.getElementById('dash-custom-styles')) return;

    const style = document.createElement('style');
    style.id = 'dash-custom-styles';
    style.textContent = `
      /* Product Grid Layout */
      .dash-product-section {
        margin-top: 10px;
        margin-bottom: 90px;
      }
      .dash-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .dash-section-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-main);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dash-search-input {
        max-width: 280px;
        padding: 8px 12px;
        font-size: 0.88rem;
      }
      .dash-product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 16px;
      }
      .dash-product-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: var(--shadow-sm);
        transition: var(--transition);
        position: relative;
      }
      .dash-product-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: #cbd5e1;
      }
      .dash-product-card.in-cart {
        border-color: #10b981;
        background: #f0fdf4;
      }
      .dash-product-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        gap: 8px;
      }
      .dash-product-name {
        font-size: 0.98rem;
        font-weight: 700;
        color: var(--text-main);
        line-height: 1.3;
        margin-bottom: 6px;
      }
      .dash-product-meta {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .dash-product-price {
        font-size: 1.1rem;
        font-weight: 800;
        color: #059669;
      }
      .dash-qty-control {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 3px;
        gap: 6px;
      }
      .dash-qty-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: var(--surface-alt);
        color: var(--text-main);
        font-size: 1.1rem;
        font-weight: 700;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
      }
      .dash-qty-btn:hover:not(:disabled) {
        background: #059669;
        color: #ffffff;
      }
      .dash-qty-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .dash-qty-val {
        font-weight: 700;
        font-size: 0.95rem;
        min-width: 30px;
        text-align: center;
      }
      .dash-btn-add {
        width: 100%;
        padding: 8px 12px;
        background: #059669;
        color: #ffffff;
        border: none;
        border-radius: var(--radius-sm);
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .dash-btn-add:hover:not(:disabled) {
        background: #047857;
      }
      .dash-btn-add:disabled {
        background: #e2e8f0;
        color: #94a3b8;
        cursor: not-allowed;
      }

      /* Floating Cart Summary Bar */
      .dash-floating-cart {
        position: fixed;
        bottom: 24px;
        right: 24px;
        left: auto;
        background: #0f172a;
        color: #ffffff;
        padding: 14px 22px;
        border-radius: 50px;
        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
        display: none;
        align-items: center;
        gap: 20px;
        z-index: 90;
        animation: floatUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dash-floating-cart.active {
        display: flex;
      }
      @keyframes floatUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .dash-cart-info {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .dash-cart-count-badge {
        background: #059669;
        color: #ffffff;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
      }
      .dash-cart-total {
        font-size: 1.05rem;
        font-weight: 800;
        color: #34d399;
      }
      .dash-btn-create-inv {
        background: #059669;
        color: #ffffff;
        border: none;
        padding: 9px 18px;
        border-radius: 30px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dash-btn-create-inv:hover {
        background: #10b981;
      }
      .dash-btn-clear-cart {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 0.82rem;
        cursor: pointer;
        text-decoration: underline;
        padding: 4px 6px;
      }
      .dash-btn-clear-cart:hover {
        color: #f87171;
      }

      /* Mode Switcher Pills in Modal */
      .dash-cust-mode-pills {
        display: flex;
        gap: 8px;
        background: var(--surface-alt);
        padding: 4px;
        border-radius: var(--radius-sm);
        margin-bottom: 14px;
      }
      .dash-mode-pill {
        flex: 1;
        text-align: center;
        padding: 6px 12px;
        font-size: 0.85rem;
        font-weight: 600;
        border-radius: var(--radius-sm);
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--text-muted);
        transition: var(--transition);
      }
      .dash-mode-pill.active {
        background: #ffffff;
        color: var(--text-main);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      /* Fullscreen New Bill Page / Overlay */
      #dash-bill-modal.modal-backdrop {
        position: fixed;
        inset: 0;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #ffffff;
        padding: 0;
        margin: 0;
        z-index: 1000;
        display: none;
        align-items: stretch;
        justify-content: stretch;
        overflow: hidden;
      }
      #dash-bill-modal.modal-backdrop.active {
        display: flex;
        flex-direction: column;
        animation: fadeIn 0.15s ease-out;
      }
      #dash-bill-modal .modal-dialog {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        margin: 0;
        border-radius: 0;
        border: none;
        box-shadow: none;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .dash-bill-fullscreen-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 24px;
        background: #ffffff;
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 25;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        flex-shrink: 0;
      }
      .dash-bill-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid var(--border);
        background: var(--surface-alt);
        color: var(--text-main);
        cursor: pointer;
        transition: all 0.15s ease;
        padding: 6px;
        flex-shrink: 0;
      }
      .dash-bill-back-btn:hover {
        background: #e2e8f0;
        color: #059669;
        border-color: #cbd5e1;
        transform: scale(1.04);
      }
      .dash-bill-back-btn:active {
        transform: scale(0.96);
      }
      .dash-bill-back-icon {
        width: 30px;
        height: 30px;
        display: block;
      }
      .dash-bill-header-text {
        display: flex;
        flex-direction: column;
      }
      .dash-bill-header-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-main);
        margin: 0;
        line-height: 1.2;
      }
      .dash-bill-header-sub {
        font-size: 0.82rem;
        color: var(--text-muted);
      }
      .dash-bill-scroll-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px 20px 40px;
        -webkit-overflow-scrolling: touch;
        background: #f8fafc;
      }
      .dash-bill-container {
        max-width: 860px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .dash-bill-section-card {
        background: #ffffff;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 20px;
        box-shadow: var(--shadow-sm);
      }
      .dash-bill-section-title {
        font-size: 0.98rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dash-bill-fullscreen-footer {
        padding: 14px 24px;
        background: #ffffff;
        border-top: 1px solid var(--border);
        position: sticky;
        bottom: 0;
        z-index: 25;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.04);
        flex-shrink: 0;
      }
      .dash-bill-footer-inner {
        max-width: 860px;
        margin: 0 auto;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
      }

      @media (max-width: 768px) {
        .dash-floating-cart {
          bottom: 16px;
          left: 16px;
          right: 16px;
          border-radius: var(--radius-md);
          padding: 12px 16px;
          justify-content: space-between;
        }
        .dash-bill-fullscreen-header {
          padding: 12px 16px;
          gap: 12px;
        }
        .dash-bill-back-btn {
          width: 40px;
          height: 40px;
        }
        .dash-bill-back-icon {
          width: 26px;
          height: 26px;
        }
        .dash-bill-header-title {
          font-size: 1.1rem;
        }
        .dash-bill-scroll-body {
          padding: 14px 12px 30px;
        }
        .dash-bill-section-card {
          padding: 14px;
        }
        .dash-bill-fullscreen-footer {
          padding: 12px 16px;
        }
        .dash-bill-footer-inner {
          flex-direction: column-reverse;
          gap: 8px;
        }
        .dash-bill-footer-inner .btn {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  },

  setupDashboardLayout() {
    const dashboardView = document.getElementById('view-dashboard');
    if (!dashboardView) return;

    // Check if product grid container already exists
    let productSection = document.getElementById('dash-product-section');
    if (!productSection) {
      productSection = document.createElement('div');
      productSection.id = 'dash-product-section';
      productSection.className = 'dash-product-section';
      productSection.innerHTML = `
        <div class="dash-section-header">
          <div class="dash-section-title">
            <span>📦 Products Catalog & Quick Billing</span>
          </div>
          <input type="text" id="dash-product-search" class="form-control dash-search-input" placeholder="🔍 Search products..." />
        </div>
        <div id="dash-product-grid" class="dash-product-grid">
          <!-- Populated dynamically -->
        </div>
      `;
      dashboardView.appendChild(productSection);

      const searchInput = document.getElementById('dash-product-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.renderProductGrid();
        });
      }
    }

    // Check if floating cart bar exists
    let floatingCart = document.getElementById('dash-floating-cart');
    if (!floatingCart) {
      floatingCart = document.createElement('div');
      floatingCart.id = 'dash-floating-cart';
      floatingCart.className = 'dash-floating-cart';
      floatingCart.innerHTML = `
        <div class="dash-cart-info">
          <span class="dash-cart-count-badge" id="dash-cart-count">0 items</span>
          <span class="dash-cart-total" id="dash-cart-total">₹ 0.00</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="dash-btn-clear-cart" id="dash-btn-clear-cart">Clear</button>
          <button type="button" class="dash-btn-create-inv" id="dash-btn-open-bill">
            <span>Create Invoice</span> ➔
          </button>
        </div>
      `;
      document.body.appendChild(floatingCart);

      document.getElementById('dash-btn-clear-cart').addEventListener('click', () => {
        this.cart = {};
        this.renderProductGrid();
        this.updateFloatingCart();
      });

      document.getElementById('dash-btn-open-bill').addEventListener('click', () => {
        this.openNewBillModal();
      });
    }
  },

  setupModal() {
    if (document.getElementById('dash-bill-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'dash-bill-modal';
    modal.innerHTML = `
      <div class="modal-dialog">
        <!-- Full-screen Header with Big Back Button -->
        <div class="dash-bill-fullscreen-header">
          <button type="button" class="dash-bill-back-btn" id="dash-modal-bill-back" title="Back to Dashboard" aria-label="Back to Dashboard">
            <svg class="dash-bill-back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div class="dash-bill-header-text">
            <h2 class="dash-bill-header-title">🧾 New Bill & Invoice</h2>
            <span class="dash-bill-header-sub">Review items, customer info & generate invoice</span>
          </div>
        </div>

        <form id="dash-bill-form" style="display: flex; flex-direction: column; flex: 1; min-height: 0; margin: 0; overflow: hidden;">
          <div class="dash-bill-scroll-body">
            <div class="dash-bill-container">
              
              <!-- Customer Mode Selection Section -->
              <div class="dash-bill-section-card">
                <div class="dash-bill-section-title">
                  <span>👤 Customer Information</span>
                  <span style="font-weight: normal; color: var(--text-muted); font-size: 0.8rem;">(Optional - Walk-in uses "General")</span>
                </div>
                
                <div class="dash-cust-mode-pills">
                  <button type="button" class="dash-mode-pill active" id="dash-pill-existing">👤 Existing Customer</button>
                  <button type="button" class="dash-mode-pill" id="dash-pill-new">➕ Add New Customer</button>
                </div>

                <!-- Existing Customer Search & Dropdown -->
                <div id="dash-existing-customer-box">
                  <div style="position: relative; margin-bottom: 8px;">
                    <input type="text" id="dash-cust-search-input" class="form-control" placeholder="Search customer by name or phone..." autocomplete="off" />
                  </div>
                  <select id="dash-bill-customer-select" class="form-control">
                    <option value="">-- General / Walk-in Customer (Default) --</option>
                  </select>
                  <div id="dash-cust-search-feedback" style="display: none; margin-top: 8px; font-size: 0.82rem; padding: 8px 12px; background: var(--surface-alt); border-radius: var(--radius-sm); border: 1px dashed var(--border); color: var(--text-muted); justify-content: space-between; align-items: center;">
                    <span>No matching customer found.</span>
                    <button type="button" class="btn btn-xs btn-outline" id="dash-btn-inline-add-cust" style="font-size: 0.75rem; padding: 2px 8px; font-weight: 600;">+ Add New Customer</button>
                  </div>
                </div>

                <!-- New Customer Fields -->
                <div id="dash-new-customer-box" style="display: none;">
                  <div class="form-group" style="margin-bottom: 10px;">
                    <input type="text" id="dash-new-cust-name" class="form-control" placeholder="Customer Name (Optional - empty uses General)" />
                  </div>
                  <div class="form-row">
                    <div class="form-group flex-1" style="margin-bottom: 0;">
                      <input type="text" id="dash-new-cust-phone" class="form-control" placeholder="Phone Number" />
                    </div>
                    <div class="form-group flex-1" style="margin-bottom: 0;">
                      <input type="text" id="dash-new-cust-address" class="form-control" placeholder="Address / City" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bill Line Items Summary Table Section -->
              <div class="dash-bill-section-card">
                <div class="dash-bill-section-title">
                  <span>🛒 Cart Line Items</span>
                </div>
                <div class="table-responsive" style="max-height: 260px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th class="text-right">Price</th>
                        <th class="text-center">Qty</th>
                        <th class="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody id="dash-bill-items-body">
                      <!-- Populated dynamically -->
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Discount & Payment Details Section -->
              <div class="dash-bill-section-card">
                <div class="dash-bill-section-title">
                  <span>🏷️ Discount & Payment</span>
                </div>

                <!-- Discount Section -->
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" for="dash-bill-discount-value" style="font-weight: 600; font-size: 0.88rem;">Discount (Rs.)</label>
                  <input type="number" id="dash-bill-discount-value" class="form-control" placeholder="0" min="0" step="any" value="0" />
                </div>

                <!-- Payment Status Selection -->
                <div class="form-group" style="margin-bottom: 16px;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.88rem;">Payment Status *</label>
                  <div class="dash-payment-toggle-group" style="display: flex; gap: 10px; margin-top: 4px;">
                    <button type="button" class="dash-payment-btn" id="dash-btn-status-pending" data-status="Pending" style="flex: 1; padding: 10px 14px; border-radius: var(--radius-sm, 6px); font-weight: 700; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease; background: #dc2626; color: #ffffff; border: 1px solid #dc2626;">
                      ⏳ Pending
                    </button>
                    <button type="button" class="dash-payment-btn" id="dash-btn-status-paid" data-status="Paid" style="flex: 1; padding: 10px 14px; border-radius: var(--radius-sm, 6px); font-weight: 600; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease; background: #ffffff; color: #64748b; border: 1px solid #cbd5e1;">
                      ✅ Paid
                    </button>
                  </div>
                  <input type="hidden" id="dash-bill-payment-status" value="Pending" />
                </div>

                <!-- Grand Total Display Bar -->
                <div class="sale-summary-bar" style="background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 6px; padding: 14px 18px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 0.95rem; color: #374151;">
                    <span>Subtotal:</span>
                    <span id="dash-bill-subtotal" class="font-semibold" style="color: #1f2937;">₹ 0.00</span>
                  </div>
                  <div id="dash-bill-discount-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 0.95rem; color: #dc2626;">
                    <span>Discount:</span>
                    <span id="dash-bill-discount-amount" class="font-semibold">-₹ 0.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px dashed #a7f3d0; padding-top: 8px; margin-top: 2px;">
                    <span class="font-bold" style="color: #065f46; font-size: 1.1rem;">Grand Total:</span>
                    <span id="dash-bill-grand-total" class="font-bold" style="font-size: 1.4rem; color: #059669;">₹ 0.00</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          <!-- Sticky Footer Action Bar -->
          <div class="dash-bill-fullscreen-footer">
            <div class="dash-bill-footer-inner">
              <button type="button" class="btn btn-outline" id="dash-btn-cancel-bill">Cancel</button>
              <button type="submit" class="btn btn-primary" id="dash-btn-confirm-bill" style="background-color: #059669; border-color: #059669; padding: 10px 24px; font-weight: 700; font-size: 0.95rem;">
                📄 Confirm & Generate Invoice
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind modal events
    const backBtn = document.getElementById('dash-modal-bill-back');
    const closeBtn = document.getElementById('dash-modal-bill-close');
    const cancelBtn = document.getElementById('dash-btn-cancel-bill');
    const pillExisting = document.getElementById('dash-pill-existing');
    const pillNew = document.getElementById('dash-pill-new');
    const billForm = document.getElementById('dash-bill-form');
    const custSearchInput = document.getElementById('dash-cust-search-input');
    const inlineAddCustBtn = document.getElementById('dash-btn-inline-add-cust');
    const discountValueInput = document.getElementById('dash-bill-discount-value');

    if (backBtn) backBtn.addEventListener('click', () => this.closeBillModal());
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeBillModal());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeBillModal());

    if (discountValueInput) {
      discountValueInput.addEventListener('input', () => this.calculateBillTotal());
    }

    if (pillExisting) {
      pillExisting.addEventListener('click', () => {
        this.setCustomerMode('existing');
      });
    }

    if (pillNew) {
      pillNew.addEventListener('click', () => {
        this.setCustomerMode('new');
      });
    }

    if (custSearchInput) {
      custSearchInput.addEventListener('input', (e) => {
        this.filterCustomerOptions(e.target.value);
      });
    }

    if (inlineAddCustBtn) {
      inlineAddCustBtn.addEventListener('click', () => {
        const query = (custSearchInput ? custSearchInput.value.trim() : '');
        this.setCustomerMode('new');
        const nameInput = document.getElementById('dash-new-cust-name');
        if (nameInput) {
          if (query) nameInput.value = query;
          nameInput.focus();
        }
      });
    }

    const btnStatusPending = document.getElementById('dash-btn-status-pending');
    const btnStatusPaid = document.getElementById('dash-btn-status-paid');

    if (btnStatusPending) {
      btnStatusPending.addEventListener('click', () => {
        this.setPaymentStatus('Pending');
      });
    }

    if (btnStatusPaid) {
      btnStatusPaid.addEventListener('click', () => {
        this.setPaymentStatus('Paid');
      });
    }

    if (billForm) {
      billForm.addEventListener('submit', (e) => this.handleConfirmSale(e));
    }
  },

  setPaymentStatus(status) {
    const hiddenInput = document.getElementById('dash-bill-payment-status');
    if (hiddenInput) hiddenInput.value = status;

    const btnPending = document.getElementById('dash-btn-status-pending');
    const btnPaid = document.getElementById('dash-btn-status-paid');

    if (status === 'Paid') {
      if (btnPaid) {
        btnPaid.style.background = '#059669';
        btnPaid.style.color = '#ffffff';
        btnPaid.style.border = '1px solid #059669';
        btnPaid.style.fontWeight = '700';
        btnPaid.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.2)';
      }
      if (btnPending) {
        btnPending.style.background = '#ffffff';
        btnPending.style.color = '#64748b';
        btnPending.style.border = '1px solid #cbd5e1';
        btnPending.style.fontWeight = '600';
        btnPending.style.boxShadow = 'none';
      }
    } else {
      // Pending is active (default)
      if (btnPending) {
        btnPending.style.background = '#dc2626';
        btnPending.style.color = '#ffffff';
        btnPending.style.border = '1px solid #dc2626';
        btnPending.style.fontWeight = '700';
        btnPending.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
      }
      if (btnPaid) {
        btnPaid.style.background = '#ffffff';
        btnPaid.style.color = '#64748b';
        btnPaid.style.border = '1px solid #cbd5e1';
        btnPaid.style.fontWeight = '600';
        btnPaid.style.boxShadow = 'none';
      }
    }
  },

  filterCustomerOptions(query = '') {
    const customerSelect = document.getElementById('dash-bill-customer-select');
    const feedbackBox = document.getElementById('dash-cust-search-feedback');
    if (!customerSelect) return;

    const customers = Storage.getCustomers();
    const q = (query || '').toLowerCase().trim();

    const filtered = customers.filter(c => {
      if (!q) return true;
      const nameMatch = c.name && c.name.toLowerCase().includes(q);
      const phoneMatch = c.phone && c.phone.toLowerCase().includes(q);
      return nameMatch || phoneMatch;
    });

    customerSelect.innerHTML = '<option value="">-- General / Walk-in Customer (Default) --</option>';

    filtered.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const phoneDisplay = c.phone && c.phone !== '-' ? ` (${c.phone})` : '';
      opt.textContent = `${c.name}${phoneDisplay}`;
      customerSelect.appendChild(opt);
    });

    if (q && filtered.length === 1) {
      customerSelect.value = filtered[0].id;
    }

    if (feedbackBox) {
      if (q && filtered.length === 0) {
        feedbackBox.style.display = 'flex';
      } else {
        feedbackBox.style.display = 'none';
      }
    }
  },

  setCustomerMode(mode) {
    this.customerMode = mode;
    const pillExisting = document.getElementById('dash-pill-existing');
    const pillNew = document.getElementById('dash-pill-new');
    const existingBox = document.getElementById('dash-existing-customer-box');
    const newBox = document.getElementById('dash-new-customer-box');

    if (mode === 'existing') {
      if (pillExisting) pillExisting.classList.add('active');
      if (pillNew) pillNew.classList.remove('active');
      if (existingBox) existingBox.style.display = 'block';
      if (newBox) newBox.style.display = 'none';
    } else {
      if (pillExisting) pillExisting.classList.remove('active');
      if (pillNew) pillNew.classList.add('active');
      if (existingBox) existingBox.style.display = 'none';
      if (newBox) newBox.style.display = 'block';
    }
  },

  render() {
    this.setupDashboardLayout();
    this.renderSummaryMetrics();
    this.renderProductGrid();
    this.updateFloatingCart();
  },

  renderSummaryMetrics() {
    const products = Storage.getProducts();
    const customers = Storage.getCustomers();
    const sales = Storage.getSales();

    const totalProductsEl = document.getElementById('dash-total-products');
    const totalCustomersEl = document.getElementById('dash-total-customers');
    const totalRevenueEl = document.getElementById('dash-total-revenue');

    if (totalProductsEl) {
      totalProductsEl.textContent = products.length;
    }

    if (totalCustomersEl) {
      totalCustomersEl.textContent = customers.length;
    }

    if (totalRevenueEl) {
      const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
      totalRevenueEl.textContent = `₹ ${totalRevenue.toFixed(2)}`;
    }
  },

  renderProductGrid() {
    const grid = document.getElementById('dash-product-grid');
    if (!grid) return;

    const products = Storage.getProducts();
    const query = this.searchQuery;

    const filtered = products.filter(p => {
      const matchName = p.name && p.name.toLowerCase().includes(query);
      const matchCat = p.category && p.category.toLowerCase().includes(query);
      return matchName || matchCat;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-muted);">
          ${products.length === 0 ? 'No products in inventory yet. Add products in the Products tab.' : 'No products found matching your search.'}
        </div>
      `;
      return;
    }

    grid.innerHTML = '';

    filtered.forEach(p => {
      const stock = parseInt(p.stock, 10) || 0;
      const cartQty = this.cart[p.id] || 0;
      const isOutOfStock = stock <= 0;
      const inCart = cartQty > 0;

      const card = document.createElement('div');
      card.className = `dash-product-card ${inCart ? 'in-cart' : ''}`;
      card.id = `dash-prod-${p.id}`;

      let stockBadge = `<span class="badge badge-success">In Stock: ${stock}</span>`;
      if (stock === 0) {
        stockBadge = `<span class="badge badge-danger">Out of Stock</span>`;
      } else if (stock < 5) {
        stockBadge = `<span class="badge badge-danger">Low Stock: ${stock}</span>`;
      }

      const photoThumb = p.image
        ? `<img src="${p.image}" alt="${this.escapeHtml(p.name)}" class="dash-product-thumb" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;" />`
        : `<div class="dash-product-thumb-placeholder" style="width: 44px; height: 44px; border-radius: 6px; background: var(--surface-alt); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;">📦</div>`;

      card.innerHTML = `
        <div>
          <div class="dash-product-top">
            <span class="badge badge-category">${this.escapeHtml(p.category || 'General')}</span>
            ${stockBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            ${photoThumb}
            <div class="dash-product-name" style="margin-bottom: 0;">${this.escapeHtml(p.name)}</div>
          </div>
          <div class="dash-product-meta">
            <span>Price</span>
            <span class="dash-product-price">₹ ${parseFloat(p.price || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="dash-product-action">
          ${inCart ? `
            <div class="dash-qty-control">
              <button type="button" class="dash-qty-btn btn-minus" data-id="${p.id}">−</button>
              <span class="dash-qty-val">${cartQty}</span>
              <button type="button" class="dash-qty-btn btn-plus" data-id="${p.id}" ${cartQty >= stock ? 'disabled' : ''}>+</button>
            </div>
          ` : `
            <button type="button" class="dash-btn-add btn-add-cart" data-id="${p.id}" ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'Out of Stock' : '+ Add to Cart'}
            </button>
          `}
        </div>
      `;

      // Event listeners for +/- buttons
      const addBtn = card.querySelector('.btn-add-cart');
      const minusBtn = card.querySelector('.btn-minus');
      const plusBtn = card.querySelector('.btn-plus');

      if (addBtn) {
        addBtn.addEventListener('click', () => this.updateCartItem(p.id, 1));
      }
      if (minusBtn) {
        minusBtn.addEventListener('click', () => this.updateCartItem(p.id, -1));
      }
      if (plusBtn) {
        plusBtn.addEventListener('click', () => this.updateCartItem(p.id, 1));
      }

      grid.appendChild(card);
    });
  },

  updateCartItem(productId, delta) {
    const products = Storage.getProducts();
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    const stock = parseInt(product.stock, 10) || 0;
    const currentQty = this.cart[productId] || 0;
    const newQty = currentQty + delta;

    if (newQty > stock) {
      alert(`Only ${stock} items available in stock for ${product.name}.`);
      return;
    }

    if (newQty <= 0) {
      delete this.cart[productId];
    } else {
      this.cart[productId] = newQty;
    }

    this.renderProductGrid();
    this.updateFloatingCart();
  },

  getCartSummary() {
    const products = Storage.getProducts();
    let totalItems = 0;
    let totalAmount = 0;
    const items = [];

    Object.keys(this.cart).forEach(id => {
      const qty = this.cart[id];
      const product = products.find(p => String(p.id) === String(id));
      if (product && qty > 0) {
        const price = parseFloat(product.price) || 0;
        const subtotal = price * qty;
        totalItems += qty;
        totalAmount += subtotal;
        items.push({
          productId: product.id,
          name: product.name,
          category: product.category,
          price: price,
          qty: qty,
          total: subtotal
        });
      }
    });

    return { totalItems, totalAmount, items };
  },

  updateFloatingCart() {
    const floatingCart = document.getElementById('dash-floating-cart');
    const countEl = document.getElementById('dash-cart-count');
    const totalEl = document.getElementById('dash-cart-total');
    if (!floatingCart || !countEl || !totalEl) return;

    const { totalItems, totalAmount } = this.getCartSummary();

    if (totalItems > 0) {
      countEl.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
      totalEl.textContent = `₹ ${totalAmount.toFixed(2)}`;
      floatingCart.classList.add('active');
    } else {
      floatingCart.classList.remove('active');
    }
  },

  calculateBillTotal() {
    const { totalAmount: subtotal } = this.getCartSummary();
    const valInput = document.getElementById('dash-bill-discount-value');
    const subtotalEl = document.getElementById('dash-bill-subtotal');
    const discountEl = document.getElementById('dash-bill-discount-amount');
    const grandTotalEl = document.getElementById('dash-bill-grand-total');

    let discountAmount = valInput ? parseFloat(valInput.value) : 0;
    if (isNaN(discountAmount) || discountAmount < 0) discountAmount = 0;

    // Don't allow discount to make total negative - cap at subtotal value
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    const grandTotal = Math.max(0, subtotal - discountAmount);

    if (subtotalEl) {
      subtotalEl.textContent = `₹ ${subtotal.toFixed(2)}`;
    }
    if (discountEl) {
      if (discountAmount > 0) {
        discountEl.textContent = `-₹ ${discountAmount.toFixed(2)}`;
      } else {
        discountEl.textContent = `-₹ 0.00`;
      }
    }
    if (grandTotalEl) {
      grandTotalEl.textContent = `₹ ${grandTotal.toFixed(2)}`;
    }

    return {
      subtotal,
      discountAmount,
      grandTotal
    };
  },

  openNewBillModal() {
    const modal = document.getElementById('dash-bill-modal');
    if (!modal) return;

    const { totalItems, totalAmount, items } = this.getCartSummary();
    if (totalItems === 0) {
      alert('Cart is empty. Please add products to create an invoice.');
      return;
    }

    // Reset search & populate existing customers dropdown
    const custSearchInput = document.getElementById('dash-cust-search-input');
    if (custSearchInput) custSearchInput.value = '';
    const feedbackBox = document.getElementById('dash-cust-search-feedback');
    if (feedbackBox) feedbackBox.style.display = 'none';

    this.filterCustomerOptions('');
    this.setCustomerMode('existing');

    // Reset new customer inputs
    const nameInput = document.getElementById('dash-new-cust-name');
    const phoneInput = document.getElementById('dash-new-cust-phone');
    const addrInput = document.getElementById('dash-new-cust-address');
    const statusSelect = document.getElementById('dash-bill-payment-status');
    const discountValueInput = document.getElementById('dash-bill-discount-value');

    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addrInput) addrInput.value = '';
    this.setPaymentStatus('Pending');
    if (discountValueInput) discountValueInput.value = '0';

    // Populate cart items review table
    const itemsTbody = document.getElementById('dash-bill-items-body');

    if (itemsTbody) {
      itemsTbody.innerHTML = '';
      const allProducts = Storage.getProducts();
      items.forEach(item => {
        const prod = allProducts.find(p => String(p.id) === String(item.productId));
        const itemThumb = (prod && prod.image)
          ? `<img src="${prod.image}" alt="" style="width: 28px; height: 28px; border-radius: 4px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border);" />`
          : `<span style="font-size: 1rem; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-alt); border-radius: 4px; border: 1px solid var(--border); flex-shrink: 0;">📦</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${itemThumb}
              <span class="font-medium">${this.escapeHtml(item.name)}</span>
            </div>
          </td>
          <td class="text-right text-muted">₹ ${item.price.toFixed(2)}</td>
          <td class="text-center font-semibold">${item.qty}</td>
          <td class="text-right font-bold text-main">₹ ${item.total.toFixed(2)}</td>
        `;
        itemsTbody.appendChild(row);
      });
    }

    this.calculateBillTotal();

    modal.classList.add('active');
  },

  closeBillModal() {
    const modal = document.getElementById('dash-bill-modal');
    if (modal) modal.classList.remove('active');
  },

  getOrCreateGeneralCustomer() {
    let customers = Storage.getCustomers();
    let generalCust = customers.find(c => c.name && c.name.trim().toLowerCase() === 'general');
    if (!generalCust) {
      generalCust = {
        id: 'cust-general',
        name: 'General',
        phone: '-',
        address: '-',
        createdAt: new Date().toISOString()
      };
      customers.push(generalCust);
      Storage.saveCustomers(customers);
    }
    return generalCust;
  },

  handleConfirmSale(e) {
    e.preventDefault();

    const { totalItems, items } = this.getCartSummary();
    if (totalItems === 0 || items.length === 0) {
      alert('Cart is empty.');
      return;
    }

    const calc = this.calculateBillTotal();
    const subtotal = calc.subtotal;
    const discountAmount = calc.discountAmount;
    const finalTotal = calc.grandTotal;

    let customer = null;
    const customers = Storage.getCustomers();

    if (this.customerMode === 'existing') {
      const customerSelect = document.getElementById('dash-bill-customer-select');
      const custId = customerSelect ? customerSelect.value : '';
      if (custId) {
        customer = customers.find(c => String(c.id) === String(custId));
      }
      if (!customer) {
        customer = this.getOrCreateGeneralCustomer();
      }
    } else {
      const nameInput = document.getElementById('dash-new-cust-name');
      const phoneInput = document.getElementById('dash-new-cust-phone');
      const addrInput = document.getElementById('dash-new-cust-address');

      const nameVal = nameInput ? nameInput.value.trim() : '';
      if (nameVal) {
        customer = {
          id: Date.now().toString(),
          name: nameVal,
          phone: phoneInput ? phoneInput.value.trim() : '',
          address: addrInput ? addrInput.value.trim() : '',
          createdAt: new Date().toISOString()
        };

        const allCusts = Storage.getCustomers();
        allCusts.push(customer);
        Storage.saveCustomers(allCusts);
      } else {
        customer = this.getOrCreateGeneralCustomer();
      }
    }

    // Validate inventory stock again
    const products = Storage.getProducts();
    for (const item of items) {
      const p = products.find(prod => String(prod.id) === String(item.productId));
      if (!p || p.stock < item.qty) {
        alert(`Insufficient stock for "${item.name}". Available: ${p ? p.stock : 0}`);
        return;
      }
    }

    // Reduce stock from products
    items.forEach(item => {
      const pIndex = products.findIndex(p => String(p.id) === String(item.productId));
      if (pIndex !== -1) {
        products[pIndex].stock = Math.max(0, products[pIndex].stock - item.qty);
      }
    });
    Storage.saveProducts(products);

    // Get payment status (default: Pending)
    const statusSelect = document.getElementById('dash-bill-payment-status');
    const paymentStatus = statusSelect ? statusSelect.value : 'Pending';

    // Save sales record
    const sales = Storage.getSales();
    const invoiceNumber = 'INV-' + (1000 + sales.length + 1);
    const newSale = {
      id: Date.now().toString(),
      invoiceNo: invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      items: items,
      subtotal: subtotal,
      discountAmount: discountAmount,
      total: finalTotal,
      status: paymentStatus,
      paymentStatus: paymentStatus,
      date: new Date().toISOString()
    };

    sales.push(newSale);
    Storage.saveSales(sales);

    // Clear cart and close popup (no auto PDF download)
    this.cart = {};
    this.closeBillModal();

    // Refresh views
    this.render();

    if (window.Products && typeof Products.render === 'function') {
      Products.render();
    }
    if (window.Customers && typeof Customers.render === 'function') {
      Customers.render();
    }
    if (window.Sales && typeof Sales.renderSalesList === 'function') {
      Sales.renderSalesList();
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Dashboard = Dashboard;


