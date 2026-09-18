// ==========================================
// SALES MODULE - Sales Creation & Management Logic
// ==========================================

const Sales = {
  // Current items in the active sale form
  currentSaleItems: [],

  init() {
    this.bindEvents();
    this.populateCustomerDropdown();
    this.populateProductDropdown();
    this.renderSalesList();
  },

  bindEvents() {
    const saleForm = document.getElementById('new-sale-form');
    const addProductLineBtn = document.getElementById('btn-add-sale-item');
    const newSaleBtn = document.getElementById('btn-new-sale-modal');
    const cancelBtn = document.getElementById('btn-cancel-sale');
    const modalClose = document.getElementById('modal-sale-close');
    const searchInput = document.getElementById('sales-search');

    if (saleForm) {
      saleForm.addEventListener('submit', (e) => this.handleCreateSale(e));
    }

    if (addProductLineBtn) {
      addProductLineBtn.addEventListener('click', () => this.addItemRow());
    }

    if (newSaleBtn) {
      newSaleBtn.addEventListener('click', () => this.openNewSaleModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderSalesList());
    }
  },

  // Open modal to create a new sale
  openNewSaleModal() {
    const modal = document.getElementById('sale-modal');
    const form = document.getElementById('new-sale-form');
    if (!modal || !form) return;

    form.reset();
    this.currentSaleItems = [];
    this.populateCustomerDropdown();

    const statusSelect = document.getElementById('sale-payment-status');
    if (statusSelect) statusSelect.value = 'Pending';

    const itemsContainer = document.getElementById('sale-items-container');
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      // Start with 1 default item row
      this.addItemRow();
    }

    this.updateGrandTotal();
    const custSelect = document.getElementById('sale-customer-select');
    if (custSelect) custSelect.removeAttribute('required');
    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('sale-modal');
    const form = document.getElementById('new-sale-form');
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
    this.currentSaleItems = [];
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

  // Populate Customers dropdown in sale modal
  populateCustomerDropdown() {
    const customerSelect = document.getElementById('sale-customer-select');
    if (!customerSelect) return;

    const customers = Storage.getCustomers();
    customerSelect.innerHTML = '<option value="">-- General / Walk-in Customer (Default) --</option>';

    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const phoneDisplay = c.phone && c.phone !== '-' ? ` (${c.phone})` : '';
      opt.textContent = `${c.name}${phoneDisplay}`;
      customerSelect.appendChild(opt);
    });
  },

  // Populate Product select options for dynamic line items
  populateProductDropdown() {
    // Helper to refresh options on any active row
    const selects = document.querySelectorAll('.sale-product-select');
    const products = Storage.getProducts();

    selects.forEach(select => {
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- Select Product --</option>';
      products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} - ₹ ${parseFloat(p.price).toFixed(2)} (Stock: ${p.stock})`;
        opt.dataset.price = p.price;
        opt.dataset.stock = p.stock;
        opt.dataset.name = p.name;
        if (p.stock <= 0) {
          opt.disabled = true;
          opt.textContent += ' [Out of stock]';
        }
        select.appendChild(opt);
      });
      if (currentVal) select.value = currentVal;
    });
  },

  // Add an item row in the sale form
  addItemRow() {
    const container = document.getElementById('sale-items-container');
    if (!container) return;

    const products = Storage.getProducts();
    const rowId = 'sale-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    const row = document.createElement('div');
    row.className = 'sale-item-row';
    row.id = rowId;

    let productOptions = '<option value="">-- Select Product --</option>';
    products.forEach(p => {
      const disabled = p.stock <= 0 ? 'disabled' : '';
      const stockText = p.stock <= 0 ? ' [Out of stock]' : ` (Stock: ${p.stock})`;
      productOptions += `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}" data-name="${p.name}" ${disabled}>
        ${p.name} - ₹ ${parseFloat(p.price).toFixed(2)}${stockText}
      </option>`;
    });

    row.innerHTML = `
      <div class="form-group flex-2">
        <label class="form-label text-xs">Product</label>
        <select class="form-control sale-product-select" required>
          ${productOptions}
        </select>
      </div>
      <div class="form-group flex-1">
        <label class="form-label text-xs">Price (₹)</label>
        <input type="number" class="form-control sale-item-price" step="0.01" min="0" placeholder="0.00" readonly />
      </div>
      <div class="form-group flex-1">
        <label class="form-label text-xs">Qty</label>
        <input type="number" class="form-control sale-item-qty" min="1" value="1" required />
      </div>
      <div class="form-group flex-1">
        <label class="form-label text-xs">Total (₹)</label>
        <input type="text" class="form-control sale-item-subtotal" value="0.00" readonly />
      </div>
      <button type="button" class="btn btn-sm btn-danger btn-remove-item" title="Remove item">
        ✕
      </button>
    `;

    const productSelect = row.querySelector('.sale-product-select');
    const priceInput = row.querySelector('.sale-item-price');
    const qtyInput = row.querySelector('.sale-item-qty');
    const subtotalInput = row.querySelector('.sale-item-subtotal');
    const removeBtn = row.querySelector('.btn-remove-item');

    const updateRowTotal = () => {
      const selectedOption = productSelect.options[productSelect.selectedIndex];
      if (!selectedOption || !selectedOption.value) {
        priceInput.value = '';
        subtotalInput.value = '0.00';
        this.updateGrandTotal();
        return;
      }

      const price = parseFloat(selectedOption.dataset.price) || 0;
      const maxStock = parseInt(selectedOption.dataset.stock, 10) || 0;
      let qty = parseInt(qtyInput.value, 10) || 1;

      if (qty < 1) {
        qty = 1;
        qtyInput.value = 1;
      }

      if (qty > maxStock) {
        alert(`Only ${maxStock} items in stock for ${selectedOption.dataset.name}. Quantity adjusted.`);
        qty = maxStock;
        qtyInput.value = maxStock;
      }

      priceInput.value = price.toFixed(2);
      const subtotal = price * qty;
      subtotalInput.value = subtotal.toFixed(2);

      this.updateGrandTotal();
    };

    productSelect.addEventListener('change', updateRowTotal);
    qtyInput.addEventListener('input', updateRowTotal);

    removeBtn.addEventListener('click', () => {
      const allRows = container.querySelectorAll('.sale-item-row');
      if (allRows.length <= 1) {
        alert('At least one product item is required for a sale.');
        return;
      }
      row.remove();
      this.updateGrandTotal();
    });

    container.appendChild(row);
  },

  // Calculate and update the modal grand total
  updateGrandTotal() {
    const container = document.getElementById('sale-items-container');
    const grandTotalEl = document.getElementById('sale-modal-grand-total');
    if (!container || !grandTotalEl) return;

    let total = 0;
    const rows = container.querySelectorAll('.sale-item-row');
    rows.forEach(row => {
      const subtotalInput = row.querySelector('.sale-item-subtotal');
      if (subtotalInput) {
        total += parseFloat(subtotalInput.value) || 0;
      }
    });

    grandTotalEl.textContent = `₹ ${total.toFixed(2)}`;
  },

  // Handle completing the sale
  handleCreateSale(e) {
    e.preventDefault();

    const customerSelect = document.getElementById('sale-customer-select');
    const customerId = customerSelect ? customerSelect.value : '';

    let customer = null;
    const customers = Storage.getCustomers();
    if (customerId) {
      customer = customers.find(c => String(c.id) === String(customerId));
    }
    if (!customer) {
      customer = this.getOrCreateGeneralCustomer();
    }

    const container = document.getElementById('sale-items-container');
    const rows = container.querySelectorAll('.sale-item-row');

    if (rows.length === 0) {
      alert('Please add at least one product.');
      return;
    }

    const products = Storage.getProducts();
    const items = [];
    let grandTotal = 0;

    // Validate rows & check stock
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productSelect = row.querySelector('.sale-product-select');
      const qtyInput = row.querySelector('.sale-item-qty');

      const productId = productSelect.value;
      const qty = parseInt(qtyInput.value, 10);

      if (!productId) {
        alert('Please select a product for all rows.');
        return;
      }

      if (!qty || qty <= 0) {
        alert('Quantity must be greater than 0.');
        return;
      }

      const product = products.find(p => String(p.id) === String(productId));
      if (!product) {
        alert(`Product not found.`);
        return;
      }

      if (qty > product.stock) {
        alert(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`);
        return;
      }

      const price = parseFloat(product.price);
      const subtotal = price * qty;
      grandTotal += subtotal;

      items.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: price,
        qty: qty,
        total: subtotal
      });
    }

    // Deduct stock from products
    items.forEach(item => {
      const pIndex = products.findIndex(p => String(p.id) === String(item.productId));
      if (pIndex !== -1) {
        products[pIndex].stock = Math.max(0, products[pIndex].stock - item.qty);
      }
    });

    // Save updated products stock
    Storage.saveProducts(products);

    // Get payment status (default: Pending)
    const statusSelect = document.getElementById('sale-payment-status');
    const paymentStatus = statusSelect ? statusSelect.value : 'Pending';

    // Create Sale record
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
      total: grandTotal,
      status: paymentStatus,
      paymentStatus: paymentStatus,
      date: new Date().toISOString()
    };

    sales.push(newSale);
    Storage.saveSales(sales);

    this.closeModal();

    // Refresh products, customers, and sales views
    if (window.Products && typeof Products.render === 'function') {
      Products.render();
    }
    if (window.Customers && typeof Customers.render === 'function') {
      Customers.render();
    }
    if (window.Dashboard && typeof Dashboard.render === 'function') {
      Dashboard.render();
    }

    this.renderSalesList();
  },

  // Toggle payment status between Paid and Pending
  toggleSaleStatus(saleId) {
    const sales = Storage.getSales();
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (sale) {
      const current = sale.paymentStatus || sale.status || 'Pending';
      const updated = current === 'Paid' ? 'Pending' : 'Paid';
      sale.paymentStatus = updated;
      sale.status = updated;
      Storage.saveSales(sales);
      this.renderSalesList();
      if (window.Customers && typeof Customers.render === 'function') {
        Customers.render();
      }
      if (window.Dashboard && typeof Dashboard.render === 'function') {
        Dashboard.render();
      }
    }
  },

  // Process Item / Sale Return
  processReturn(saleId, customerIdForProfileRefresh = null) {
    const sales = Storage.getSales();
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) {
      alert('Sale record not found.');
      return;
    }

    if (!sale.items || sale.items.length === 0) {
      alert('No items found in this sale.');
      return;
    }

    const returnableItems = sale.items.filter(item => {
      const returned = parseInt(item.returnedQty, 10) || 0;
      const qty = parseInt(item.qty, 10) || 0;
      return (qty - returned) > 0;
    });

    if (returnableItems.length === 0) {
      alert('All items in this sale have already been returned.');
      return;
    }

    let selectedItem = null;
    let availableQty = 0;

    if (returnableItems.length === 1) {
      selectedItem = returnableItems[0];
      availableQty = (parseInt(selectedItem.qty, 10) || 0) - (parseInt(selectedItem.returnedQty, 10) || 0);
    } else {
      let menuText = 'This sale contains multiple items. Select the item number to return:\n\n';
      returnableItems.forEach((item, index) => {
        const itemRem = (parseInt(item.qty, 10) || 0) - (parseInt(item.returnedQty, 10) || 0);
        menuText += `${index + 1}. ${item.name} — Unit Price: ₹${parseFloat(item.price).toFixed(2)} (Available to return: ${itemRem})\n`;
      });
      menuText += `\nEnter item number (1 to ${returnableItems.length}):`;

      const choice = prompt(menuText);
      if (choice === null) return;
      const choiceIdx = parseInt(choice, 10) - 1;
      if (isNaN(choiceIdx) || choiceIdx < 0 || choiceIdx >= returnableItems.length) {
        alert(`Invalid selection. Please enter a number between 1 and ${returnableItems.length}.`);
        return;
      }
      selectedItem = returnableItems[choiceIdx];
      availableQty = (parseInt(selectedItem.qty, 10) || 0) - (parseInt(selectedItem.returnedQty, 10) || 0);
    }

    let qtyToReturn = 0;
    const unitPrice = parseFloat(selectedItem.price) || 0;

    if (availableQty === 1) {
      const confirmReturn = confirm(`Return this item?\n\nProduct: ${selectedItem.name}\nQuantity: 1\nRefund Amount: ₹ ${unitPrice.toFixed(2)}`);
      if (!confirmReturn) return;
      qtyToReturn = 1;
    } else {
      const qtyPrompt = prompt(`Return item: ${selectedItem.name}\nUnit Price: ₹ ${unitPrice.toFixed(2)}\nAvailable Quantity to return: ${availableQty}\n\nEnter quantity to return (1 to ${availableQty}):`, availableQty);
      if (qtyPrompt === null) return;
      qtyToReturn = parseInt(qtyPrompt, 10);
      if (isNaN(qtyToReturn) || qtyToReturn < 1 || qtyToReturn > availableQty) {
        alert(`Invalid quantity. Please enter a number between 1 and ${availableQty}.`);
        return;
      }
    }

    const returnAmount = unitPrice * qtyToReturn;

    // 1. Increase product stock back in products
    const products = Storage.getProducts();
    const prodIndex = products.findIndex(p => String(p.id) === String(selectedItem.productId));
    if (prodIndex !== -1) {
      products[prodIndex].stock = (parseInt(products[prodIndex].stock, 10) || 0) + qtyToReturn;
      Storage.saveProducts(products);
    }

    // 2. Update sale record
    selectedItem.returnedQty = (parseInt(selectedItem.returnedQty, 10) || 0) + qtyToReturn;
    if (selectedItem.returnedQty >= selectedItem.qty) {
      selectedItem.isReturned = true;
    }

    sale.returnedAmount = (parseFloat(sale.returnedAmount) || 0) + returnAmount;
    sale.total = Math.max(0, (parseFloat(sale.total) || 0) - returnAmount);

    const allItemsReturned = sale.items.every(i => (parseInt(i.returnedQty, 10) || 0) >= (parseInt(i.qty, 10) || 0));
    if (allItemsReturned) {
      sale.returnStatus = 'Returned';
      sale.status = 'Returned';
      sale.paymentStatus = 'Returned';
    } else {
      sale.returnStatus = 'Partially Returned';
    }

    Storage.saveSales(sales);

    // 3. Refresh views immediately
    if (window.Products && typeof Products.render === 'function') {
      Products.render();
    }
    if (window.Dashboard && typeof Dashboard.render === 'function') {
      Dashboard.render();
    }
    this.renderSalesList();

    if (window.Customers && typeof Customers.render === 'function') {
      Customers.render();
      if (customerIdForProfileRefresh) {
        Customers.viewProfile(customerIdForProfileRefresh);
      }
    }

    alert(`✅ Return processed successfully!\n- Product: ${selectedItem.name}\n- Qty Returned: ${qtyToReturn}\n- Stock Restored: +${qtyToReturn}\n- Total Deducted: ₹ ${returnAmount.toFixed(2)}`);
  },

  // Render sales list table
  renderSalesList() {
    const tbody = document.getElementById('sales-table-body');
    const searchInput = document.getElementById('sales-search');
    const countEl = document.getElementById('sales-count');
    const totalRevEl = document.getElementById('sales-total-revenue');

    if (!tbody) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const allSales = Storage.getSales();

    let totalRevenue = 0;
    allSales.forEach(s => {
      totalRevenue += parseFloat(s.total) || 0;
    });

    if (countEl) countEl.textContent = allSales.length;
    if (totalRevEl) totalRevEl.textContent = `₹ ${totalRevenue.toFixed(2)}`;

    const filtered = allSales.filter(s => {
      const matchInv = s.invoiceNo && s.invoiceNo.toLowerCase().includes(query);
      const matchCust = s.customerName && s.customerName.toLowerCase().includes(query);
      const matchStatus = (s.paymentStatus || s.status || 'Pending').toLowerCase().includes(query);
      return matchInv || matchCust || matchStatus;
    });

    // Sort newest first
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-muted">
            ${allSales.length === 0 ? 'No sales recorded yet. Click "+ New Sale" to create an order.' : 'No sales match your search.'}
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(sale => {
      const formattedDate = sale.date ? new Date(sale.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A';

      const itemsSummary = (sale.items || []).map(i => {
        const retQty = parseInt(i.returnedQty, 10) || 0;
        if (retQty >= i.qty) {
          return `${this.escapeHtml(i.name)} (x${i.qty}) <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.7rem; padding:1px 5px;">Returned</span>`;
        } else if (retQty > 0) {
          return `${this.escapeHtml(i.name)} (x${i.qty - retQty}) <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.7rem; padding:1px 5px;">${retQty} Ret.</span>`;
        }
        return `${this.escapeHtml(i.name)} (x${i.qty})`;
      }).join(', ');

      const allItemsReturned = (sale.items && sale.items.length > 0) && sale.items.every(i => (parseInt(i.returnedQty, 10) || 0) >= (parseInt(i.qty, 10) || 0));
      const hasPartialReturn = !allItemsReturned && (sale.items || []).some(i => (parseInt(i.returnedQty, 10) || 0) > 0);

      const status = sale.paymentStatus || sale.status || 'Pending';
      const isPaid = status === 'Paid';

      let statusBadgeHtml = '';
      if (allItemsReturned) {
        statusBadgeHtml = `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-weight:700; font-size:0.78rem; padding:4px 10px;">↩️ Returned</span>`;
      } else if (hasPartialReturn) {
        statusBadgeHtml = `
          <button type="button" class="btn-toggle-status badge ${isPaid ? 'badge-success' : 'badge-warning'}" data-id="${sale.id}" style="cursor: pointer; border: none; font-size: 0.78rem; padding: 4px 10px; font-weight: 700;" title="Click to toggle Paid / Pending">
            ${isPaid ? '✅ Paid' : '⏳ Pending'}
          </button>
          <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.72rem; padding:2px 6px; margin-top:3px; display:inline-block;">↩️ Partial Return</span>
        `;
      } else {
        statusBadgeHtml = `
          <button type="button" class="btn-toggle-status badge ${isPaid ? 'badge-success' : 'badge-warning'}" data-id="${sale.id}" style="cursor: pointer; border: none; font-size: 0.78rem; padding: 4px 10px; font-weight: 700;" title="Click to toggle Paid / Pending">
            ${isPaid ? '✅ Paid' : '⏳ Pending'}
          </button>
        `;
      }

      const actionStatusBadgeHtml = allItemsReturned
        ? `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.75rem; padding:4px 8px; font-weight:700;">↩️ Returned</span>`
        : `<button type="button" class="btn-action-toggle-status badge ${isPaid ? 'badge-success' : 'badge-warning'}" data-id="${sale.id}" style="cursor: pointer; border: none; font-size: 0.75rem; padding: 4px 8px; font-weight: 700;" title="Click to toggle Paid / Pending">${isPaid ? '✅ Paid' : '⏳ Pending'}</button>`;

      const actionReturnBtnHtml = allItemsReturned
        ? `<button type="button" class="btn btn-sm btn-outline" disabled style="opacity: 0.5; cursor: not-allowed;" title="All items in this sale have been returned">↩️ Returned</button>`
        : `<button type="button" class="btn btn-sm btn-outline btn-return-sale" data-id="${sale.id}" title="Return item(s)">↩️ Return</button>`;

      let discountInfoHtml = '';
      const discountVal = parseFloat(sale.discountValue) || 0;
      const discountAmt = parseFloat(sale.discountAmount) || 0;
      if (discountVal > 0 || discountAmt > 0) {
        if (sale.discountType === 'percentage') {
          discountInfoHtml = `<div class="text-xs font-normal" style="color: #dc2626;">${discountVal}% off</div>`;
        } else {
          discountInfoHtml = `<div class="text-xs font-normal" style="color: #dc2626;">Discount: Rs. ${(discountAmt || discountVal).toFixed(2)}</div>`;
        }
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="font-semibold text-main">${this.escapeHtml(sale.invoiceNo || 'INV-' + sale.id)}</td>
        <td>
          <div class="font-medium text-main">${this.escapeHtml(sale.customerName || 'N/A')}</div>
          <div class="text-xs text-muted">${this.escapeHtml(sale.customerPhone || '')}</div>
        </td>
        <td class="text-muted text-sm">${formattedDate}</td>
        <td class="text-sm text-muted">${itemsSummary}</td>
        <td class="font-bold text-main">
          ₹ ${parseFloat(sale.total).toFixed(2)}
          ${discountInfoHtml}
          ${sale.returnedAmount && parseFloat(sale.returnedAmount) > 0 ? `<div class="text-xs text-muted font-normal">(Ret: ₹${parseFloat(sale.returnedAmount).toFixed(2)})</div>` : ''}
        </td>
        <td>
          ${statusBadgeHtml}
        </td>
        <td class="text-right">
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
            ${actionStatusBadgeHtml}
            ${actionReturnBtnHtml}
            <button class="btn btn-sm btn-primary btn-download-invoice" data-id="${sale.id}">
              📄 Invoice
            </button>
          </div>
        </td>
      `;

      const statusToggleBtn = row.querySelector('.btn-toggle-status');
      if (statusToggleBtn) {
        statusToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSaleStatus(sale.id);
        });
      }

      const actionStatusToggleBtn = row.querySelector('.btn-action-toggle-status');
      if (actionStatusToggleBtn) {
        actionStatusToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSaleStatus(sale.id);
        });
      }

      const returnBtn = row.querySelector('.btn-return-sale');
      if (returnBtn) {
        returnBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.processReturn(sale.id);
        });
      }

      row.querySelector('.btn-download-invoice').addEventListener('click', () => {
        InvoiceGenerator.generatePDF(sale);
      });

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

window.Sales = Sales;
