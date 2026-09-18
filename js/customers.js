// ==========================================
// CUSTOMERS MODULE - Customer Management Logic
// ==========================================

const Customers = {
  // Current editing customer ID
  editingId: null,

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const customerForm = document.getElementById('customer-form');
    const searchInput = document.getElementById('customer-search');
    const addCustomerBtn = document.getElementById('btn-add-customer-modal');
    const cancelBtn = document.getElementById('btn-cancel-customer');
    const modalClose = document.getElementById('modal-customer-close');
    const profileClose = document.getElementById('modal-profile-close');
    const profileCloseBtn = document.getElementById('btn-close-profile');

    if (customerForm) {
      customerForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.render());
    }

    if (addCustomerBtn) {
      addCustomerBtn.addEventListener('click', () => this.openModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }

    if (profileClose) {
      profileClose.addEventListener('click', () => this.closeProfileModal());
    }

    if (profileCloseBtn) {
      profileCloseBtn.addEventListener('click', () => this.closeProfileModal());
    }
  },

  // Open modal for add/edit customer
  openModal(customer = null) {
    const modal = document.getElementById('customer-modal');
    const modalTitle = document.getElementById('customer-modal-title');
    const form = document.getElementById('customer-form');

    if (!modal || !form) return;

    if (customer) {
      this.editingId = customer.id;
      modalTitle.textContent = 'Edit Customer';
      document.getElementById('customer-name').value = customer.name;
      document.getElementById('customer-phone').value = customer.phone || '';
      document.getElementById('customer-address').value = customer.address || '';
    } else {
      this.editingId = null;
      modalTitle.textContent = 'Add New Customer';
      form.reset();
    }

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
    this.editingId = null;
  },

  closeProfileModal() {
    const modal = document.getElementById('customer-profile-modal');
    if (modal) modal.classList.remove('active');
  },

  handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();

    if (!name) {
      alert('Please enter customer name.');
      return;
    }

    const customers = Storage.getCustomers();

    if (this.editingId) {
      const index = customers.findIndex(c => c.id === this.editingId);
      if (index !== -1) {
        customers[index] = {
          ...customers[index],
          name,
          phone,
          address
        };
      }
    } else {
      const newCustomer = {
        id: Date.now().toString(),
        name,
        phone,
        address,
        createdAt: new Date().toISOString()
      };
      customers.push(newCustomer);
    }

    Storage.saveCustomers(customers);
    this.closeModal();
    this.render();

    // Refresh sales customer dropdown if sales module is active
    if (window.Sales && typeof Sales.populateCustomerDropdown === 'function') {
      Sales.populateCustomerDropdown();
    }

    // Refresh dashboard stats
    if (window.Dashboard && typeof Dashboard.render === 'function') {
      Dashboard.render();
    }
  },

  deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    let customers = Storage.getCustomers();
    customers = customers.filter(c => c.id !== id);
    Storage.saveCustomers(customers);
    this.render();

    if (window.Sales && typeof Sales.populateCustomerDropdown === 'function') {
      Sales.populateCustomerDropdown();
    }

    if (window.Dashboard && typeof Dashboard.render === 'function') {
      Dashboard.render();
    }
  },

  editCustomer(id) {
    const customers = Storage.getCustomers();
    const customer = customers.find(c => c.id === id);
    if (customer) {
      this.openModal(customer);
    }
  },

  // View Customer Profile + Full Purchase History
  viewProfile(id) {
    const customers = Storage.getCustomers();
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    const modal = document.getElementById('customer-profile-modal');
    const nameEl = document.getElementById('profile-name');
    const phoneEl = document.getElementById('profile-phone');
    const addressEl = document.getElementById('profile-address');
    const totalSpentEl = document.getElementById('profile-total-spent');
    const totalOrdersEl = document.getElementById('profile-total-orders');
    const historyBody = document.getElementById('profile-history-body');

    if (nameEl) nameEl.textContent = customer.name;
    if (phoneEl) phoneEl.textContent = customer.phone || 'N/A';
    if (addressEl) addressEl.textContent = customer.address || 'N/A';

    // Get all sales for this customer
    const allSales = Storage.getSales();
    const customerSales = allSales.filter(s => String(s.customerId) === String(customer.id));

    let totalSpent = 0;
    customerSales.forEach(s => {
      totalSpent += parseFloat(s.total) || 0;
    });

    if (totalSpentEl) totalSpentEl.textContent = `₹ ${totalSpent.toFixed(2)}`;
    if (totalOrdersEl) totalOrdersEl.textContent = customerSales.length;

    if (historyBody) {
      historyBody.innerHTML = '';
      if (customerSales.length === 0) {
        historyBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-6 text-muted">
              No purchases recorded for this customer yet.
            </td>
          </tr>
        `;
      } else {
        customerSales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(sale => {
          const itemsSummary = (sale.items || []).map(i => {
            const retQty = parseInt(i.returnedQty, 10) || 0;
            if (retQty >= i.qty) {
              return `${this.escapeHtml(i.name)} (x${i.qty}) <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.68rem; padding:1px 4px;">Returned</span>`;
            } else if (retQty > 0) {
              return `${this.escapeHtml(i.name)} (x${i.qty - retQty}) <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.68rem; padding:1px 4px;">${retQty} Ret.</span>`;
            }
            return `${this.escapeHtml(i.name)} (x${i.qty})`;
          }).join(', ');

          const formattedDate = sale.date ? new Date(sale.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : 'N/A';

          const allItemsReturned = (sale.items && sale.items.length > 0) && sale.items.every(i => (parseInt(i.returnedQty, 10) || 0) >= (parseInt(i.qty, 10) || 0));
          const hasPartialReturn = !allItemsReturned && (sale.items || []).some(i => (parseInt(i.returnedQty, 10) || 0) > 0);

          const status = sale.paymentStatus || sale.status || 'Pending';
          const isPaid = status === 'Paid';

          let statusBadgeHtml = '';
          if (allItemsReturned) {
            statusBadgeHtml = `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-weight:700; font-size:0.75rem; padding:3px 8px;">↩️ Returned</span>`;
          } else if (hasPartialReturn) {
            statusBadgeHtml = `
              <button type="button" class="btn-profile-status-toggle badge ${isPaid ? 'badge-success' : 'badge-danger'}" data-sale-id="${sale.id}" style="cursor: pointer; border: none; font-size: 0.75rem; padding: 3px 8px; font-weight: 700;" title="Click to toggle Paid / Pending">
                ${isPaid ? '✅ Paid' : '⏳ Pending'}
              </button>
              <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.68rem; padding:1px 4px; margin-top:2px; display:inline-block;">↩️ Partial</span>
            `;
          } else {
            statusBadgeHtml = `
              <button type="button" class="btn-profile-status-toggle badge ${isPaid ? 'badge-success' : 'badge-danger'}" data-sale-id="${sale.id}" style="cursor: pointer; border: none; font-size: 0.75rem; padding: 3px 8px; font-weight: 700;" title="Click to toggle Paid / Pending">
                ${isPaid ? '✅ Paid' : '⏳ Pending'}
              </button>
            `;
          }

          const actionStatusBadgeHtml = allItemsReturned
            ? `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.72rem; padding:3px 7px; font-weight:700;">↩️ Returned</span>`
            : `<button type="button" class="btn-profile-action-status-toggle badge ${isPaid ? 'badge-success' : 'badge-danger'}" data-sale-id="${sale.id}" style="cursor: pointer; border: none; font-size: 0.72rem; padding: 3px 7px; font-weight: 700;" title="Click to toggle Paid / Pending">${isPaid ? '✅ Paid' : '⏳ Pending'}</button>`;

          const actionReturnBtnHtml = allItemsReturned
            ? `<button type="button" class="btn btn-sm btn-outline" disabled style="opacity: 0.5; cursor: not-allowed;" title="All items returned">↩️ Returned</button>`
            : `<button type="button" class="btn btn-sm btn-outline btn-profile-return-sale" data-sale-id="${sale.id}" title="Return item(s)">↩️ Return</button>`;

          let discountInfoHtml = '';
          const discountAmt = parseFloat(sale.discountAmount !== undefined ? sale.discountAmount : sale.discountValue) || 0;
          if (discountAmt > 0) {
            discountInfoHtml = `<div class="text-xs font-normal" style="color: #dc2626;">Discount: Rs. ${discountAmt.toFixed(2)}</div>`;
          }

          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="font-medium">${this.escapeHtml(sale.invoiceNo || 'INV-' + sale.id)}</td>
            <td class="text-muted">${formattedDate}</td>
            <td class="text-sm">${itemsSummary || 'Items'}</td>
            <td class="font-semibold text-main">
              ₹ ${parseFloat(sale.total).toFixed(2)}
              ${discountInfoHtml}
              ${sale.returnedAmount && parseFloat(sale.returnedAmount) > 0 ? `<div class="text-xs text-muted font-normal">(Ret: ₹${parseFloat(sale.returnedAmount).toFixed(2)})</div>` : ''}
            </td>
            <td>
              ${statusBadgeHtml}
            </td>
            <td>
              <div style="display: flex; gap: 5px; align-items: center; justify-content: flex-end; flex-wrap: wrap;">
                ${actionStatusBadgeHtml}
                ${actionReturnBtnHtml}
                <button class="btn btn-sm btn-outline btn-download-invoice" data-sale-id="${sale.id}">
                  📄 PDF
                </button>
              </div>
            </td>
          `;

          const toggleStatusHandler = (e) => {
            e.stopPropagation();
            const currentSales = Storage.getSales();
            const targetSale = currentSales.find(s => String(s.id) === String(sale.id));
            if (targetSale) {
              const currentStatus = targetSale.paymentStatus || targetSale.status || 'Pending';
              const nextStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
              targetSale.paymentStatus = nextStatus;
              targetSale.status = nextStatus;
              Storage.saveSales(currentSales);
              this.viewProfile(customer.id);
              if (window.Sales && typeof Sales.renderSalesList === 'function') {
                Sales.renderSalesList();
              }
              if (window.Dashboard && typeof Dashboard.render === 'function') {
                Dashboard.render();
              }
            }
          };

          const statusBtn = row.querySelector('.btn-profile-status-toggle');
          if (statusBtn) statusBtn.addEventListener('click', toggleStatusHandler);

          const actionStatusBtn = row.querySelector('.btn-profile-action-status-toggle');
          if (actionStatusBtn) actionStatusBtn.addEventListener('click', toggleStatusHandler);

          const returnBtn = row.querySelector('.btn-profile-return-sale');
          if (returnBtn) {
            returnBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (window.Sales && typeof Sales.processReturn === 'function') {
                Sales.processReturn(sale.id, customer.id);
              }
            });
          }

          row.querySelector('.btn-download-invoice').addEventListener('click', () => {
            InvoiceGenerator.generatePDF(sale);
          });

          historyBody.appendChild(row);
        });
      }
    }

    if (modal) modal.classList.add('active');
  },

  render() {
    const tbody = document.getElementById('customers-table-body');
    const searchInput = document.getElementById('customer-search');
    const countEl = document.getElementById('customers-count');

    if (!tbody) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const allCustomers = Storage.getCustomers();
    const allSales = Storage.getSales();

    if (countEl) countEl.textContent = allCustomers.length;

    const filtered = allCustomers.filter(c => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchPhone = c.phone && c.phone.toLowerCase().includes(query);
      const matchAddr = c.address && c.address.toLowerCase().includes(query);
      return matchName || matchPhone || matchAddr;
    });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-muted">
            ${allCustomers.length === 0 ? 'No customers added yet. Click "+ Add Customer" to get started.' : 'No customers match your search.'}
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(customer => {
      // Calculate customer purchase summary
      const customerSales = allSales.filter(s => String(s.customerId) === String(customer.id));
      const totalSpent = customerSales.reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="font-medium text-main">${this.escapeHtml(customer.name)}</div>
        </td>
        <td class="text-muted">${this.escapeHtml(customer.phone || 'N/A')}</td>
        <td class="text-muted text-sm">${this.escapeHtml(customer.address || 'N/A')}</td>
        <td>
          <span class="font-semibold text-main">₹ ${totalSpent.toFixed(2)}</span>
          <span class="text-xs text-muted block">(${customerSales.length} order${customerSales.length === 1 ? '' : 's'})</span>
        </td>
        <td class="text-right table-actions">
          <button class="btn btn-sm btn-outline btn-profile" data-id="${customer.id}" title="View Profile & History">
            👁️ Profile
          </button>
          <button class="btn btn-sm btn-outline btn-edit" data-id="${customer.id}" title="Edit Customer">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${customer.id}" title="Delete Customer">
            🗑️ Delete
          </button>
        </td>
      `;

      row.querySelector('.btn-profile').addEventListener('click', () => this.viewProfile(customer.id));
      row.querySelector('.btn-edit').addEventListener('click', () => this.editCustomer(customer.id));
      row.querySelector('.btn-delete').addEventListener('click', () => this.deleteCustomer(customer.id));

      tbody.appendChild(row);
    });
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

window.Customers = Customers;
