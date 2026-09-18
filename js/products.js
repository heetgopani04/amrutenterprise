// ==========================================
// PRODUCTS MODULE - Product Management Logic
// ==========================================

const Products = {
  // Current editing product ID (null if adding new)
  editingId: null,
  // Current image in Base64 format
  currentImageBase64: null,

  // Initialize product listeners
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const productForm = document.getElementById('product-form');
    const searchInput = document.getElementById('product-search');
    const categoryFilter = document.getElementById('product-category-filter');
    const addProductBtn = document.getElementById('btn-add-product-modal');
    const cancelBtn = document.getElementById('btn-cancel-product');
    const modalClose = document.getElementById('modal-product-close');
    const imageInput = document.getElementById('product-image');
    const removeImageBtn = document.getElementById('btn-remove-product-image');

    if (productForm) {
      productForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.render());
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.render());
    }

    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => this.openModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }

    if (imageInput) {
      imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
    }

    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => this.clearImagePreview());
    }
  },

  // Compress image using HTML5 canvas (resize + reduce JPEG quality in a loop) until <= 20KB
  compressImage(file, maxBytes = 20 * 1024) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Start with reasonable max dimensions (e.g. 600px width/height)
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;
            const maxDimension = 600;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            let quality = 0.85;
            let resultBase64 = null;
            let iterations = 0;
            const maxIterations = 30;

            while (iterations < maxIterations) {
              iterations++;
              canvas.width = Math.max(width, 1);
              canvas.height = Math.max(height, 1);

              // Clean white background (handles transparent PNGs when converting to JPEG)
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              resultBase64 = canvas.toDataURL('image/jpeg', quality);

              // Calculate binary byte size of Base64
              const base64Data = resultBase64.split(',')[1] || '';
              const byteLength = Math.round((base64Data.length * 3) / 4);

              if (byteLength <= maxBytes) {
                resolve(resultBase64);
                return;
              }

              // Progressively reduce quality and resize dimensions
              if (quality > 0.4) {
                quality = Math.max(0.35, quality - 0.15);
              } else {
                quality = 0.6;
                width = Math.round(width * 0.75);
                height = Math.round(height * 0.75);
              }

              if (width < 30 || height < 30) {
                if (byteLength <= maxBytes) {
                  resolve(resultBase64);
                } else {
                  reject(new Error('Unable to compress image under 20KB. Please choose a simpler or smaller image.'));
                }
                return;
              }
            }

            if (resultBase64) {
              const base64Data = resultBase64.split(',')[1] || '';
              const byteLength = Math.round((base64Data.length * 3) / 4);
              if (byteLength <= maxBytes) {
                resolve(resultBase64);
                return;
              }
            }

            reject(new Error('Unable to compress image under 20KB. Please choose a smaller image.'));
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to process the selected image.'));
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Error reading selected image file.'));
      };

      reader.readAsDataURL(file);
    });
  },

  // Handle image file selection & auto-compress to <= 20KB
  async handleImageSelect(e) {
    const file = e.target.files && e.target.files[0];
    const errorEl = document.getElementById('product-image-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }

    if (!file) return;

    try {
      // Automatically compress image until <= 20KB
      const compressedBase64 = await this.compressImage(file, 20 * 1024);
      this.currentImageBase64 = compressedBase64;
      this.updateImagePreview(this.currentImageBase64);
    } catch (err) {
      console.error('Image compression error:', err);
      if (errorEl) {
        errorEl.textContent = err.message || 'Image could not be compressed under 20KB. Please choose a smaller image.';
        errorEl.style.display = 'block';
      }
      alert(err.message || 'Image could not be compressed under 20KB. Please choose a smaller image.');
      e.target.value = '';
      this.clearImagePreview();
    }
  },

  // Update preview box in the product modal
  updateImagePreview(base64Src) {
    const previewImg = document.getElementById('product-image-preview');
    const placeholderIcon = document.getElementById('product-image-placeholder-icon');
    const removeBtn = document.getElementById('btn-remove-product-image');
    const errorEl = document.getElementById('product-image-error');

    if (errorEl) errorEl.style.display = 'none';

    if (base64Src) {
      if (previewImg) {
        previewImg.src = base64Src;
        previewImg.style.display = 'block';
      }
      if (placeholderIcon) {
        placeholderIcon.style.display = 'none';
      }
      if (removeBtn) {
        removeBtn.style.display = 'inline-flex';
      }
    } else {
      if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
      }
      if (placeholderIcon) {
        placeholderIcon.style.display = 'block';
      }
      if (removeBtn) {
        removeBtn.style.display = 'none';
      }
    }
  },

  // Clear current image selection
  clearImagePreview() {
    this.currentImageBase64 = null;
    const imageInput = document.getElementById('product-image');
    if (imageInput) imageInput.value = '';
    this.updateImagePreview(null);
  },

  // Open modal for adding or editing
  openModal(product = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    const imageInput = document.getElementById('product-image');

    if (!modal || !form) return;

    if (imageInput) imageInput.value = '';

    if (product) {
      this.editingId = product.id;
      this.currentImageBase64 = product.image || null;
      modalTitle.textContent = 'Edit Product';
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-category').value = product.category || '';
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-stock').value = product.stock;
      this.updateImagePreview(this.currentImageBase64);
    } else {
      this.editingId = null;
      this.currentImageBase64 = null;
      modalTitle.textContent = 'Add New Product';
      form.reset();
      this.updateImagePreview(null);
    }

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const imageInput = document.getElementById('product-image');
    const errorEl = document.getElementById('product-image-error');

    if (modal) modal.classList.remove('active');
    if (form) form.reset();
    if (imageInput) imageInput.value = '';
    if (errorEl) errorEl.style.display = 'none';

    this.editingId = null;
    this.currentImageBase64 = null;
    this.updateImagePreview(null);
  },

  // Add or update product
  handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value, 10);

    if (!name || isNaN(price) || isNaN(stock)) {
      alert('Please enter valid product details.');
      return;
    }

    if (price < 0 || stock < 0) {
      alert('Price and stock cannot be negative.');
      return;
    }

    const products = Storage.getProducts();

    if (this.editingId) {
      // Edit existing product
      const index = products.findIndex(p => p.id === this.editingId);
      if (index !== -1) {
        products[index] = {
          ...products[index],
          name,
          category: category || 'General',
          price,
          stock,
          image: this.currentImageBase64 || null
        };
      }
    } else {
      // Create new product
      const newProduct = {
        id: Date.now().toString(),
        name,
        category: category || 'General',
        price,
        stock,
        image: this.currentImageBase64 || null,
        createdAt: new Date().toISOString()
      };
      products.push(newProduct);
    }

    Storage.saveProducts(products);
    this.closeModal();
    this.render();
    this.populateCategoryFilter();

    // Trigger dashboard update if dashboard is loaded
    if (window.Dashboard && typeof Dashboard.render === 'function') {
      Dashboard.render();
    }
  },

  // Delete product
  deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    let products = Storage.getProducts();
    products = products.filter(p => p.id !== id);
    Storage.saveProducts(products);
    this.render();
    this.populateCategoryFilter();

    if (window.Dashboard && typeof Dashboard.render === 'function') {
      Dashboard.render();
    }
  },

  // Edit product trigger
  editProduct(id) {
    const products = Storage.getProducts();
    const product = products.find(p => p.id === id);
    if (product) {
      this.openModal(product);
    }
  },

  // Update dynamic category dropdown filter
  populateCategoryFilter() {
    const categoryFilter = document.getElementById('product-category-filter');
    if (!categoryFilter) return;

    const currentSelected = categoryFilter.value;
    const products = Storage.getProducts();
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();

    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    if (categories.includes(currentSelected)) {
      categoryFilter.value = currentSelected;
    }
  },

  // Render product table and stock metrics
  render() {
    const tbody = document.getElementById('products-table-body');
    const searchInput = document.getElementById('product-search');
    const categoryFilter = document.getElementById('product-category-filter');
    const totalValEl = document.getElementById('products-total-value');
    const totalCountEl = document.getElementById('products-count');
    const lowStockCountEl = document.getElementById('products-low-stock-count');

    if (!tbody) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : '';

    const allProducts = Storage.getProducts();

    // Calculate total stock value & metrics across all products
    let totalStockValue = 0;
    let lowStockCount = 0;

    allProducts.forEach(p => {
      const stock = parseInt(p.stock, 10) || 0;
      const price = parseFloat(p.price) || 0;
      totalStockValue += stock * price;
      if (stock < 5) {
        lowStockCount++;
      }
    });

    if (totalValEl) totalValEl.textContent = `₹ ${totalStockValue.toFixed(2)}`;
    if (totalCountEl) totalCountEl.textContent = allProducts.length;
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;

    // Filter products for display
    const filteredProducts = allProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query));
      const matchCategory = !selectedCategory || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });

    tbody.innerHTML = '';

    if (filteredProducts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-muted">
            ${allProducts.length === 0 ? 'No products in inventory yet. Click "+ Add Product" to get started.' : 'No products match your search or filter.'}
          </td>
        </tr>
      `;
      return;
    }

    filteredProducts.forEach(product => {
      const isLowStock = parseInt(product.stock, 10) < 5;
      const stockValue = ((parseInt(product.stock, 10) || 0) * (parseFloat(product.price) || 0)).toFixed(2);

      const row = document.createElement('tr');
      if (isLowStock) {
        row.classList.add('low-stock-row');
      }

      const photoThumb = product.image
        ? `<img src="${product.image}" alt="${this.escapeHtml(product.name)}" class="product-thumb-img" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;" />`
        : `<div class="product-thumb-placeholder" style="width: 40px; height: 40px; border-radius: 6px; background: var(--surface-alt); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;" title="No photo">📦</div>`;

      row.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${photoThumb}
            <div class="font-medium text-main">${this.escapeHtml(product.name)}</div>
          </div>
        </td>
        <td>
          <span class="badge badge-category">${this.escapeHtml(product.category || 'General')}</span>
        </td>
        <td class="font-medium">₹ ${parseFloat(product.price).toFixed(2)}</td>
        <td>
          <span class="badge ${isLowStock ? 'badge-danger' : 'badge-success'}">
            ${isLowStock ? `⚠️ Low: ${product.stock}` : product.stock}
          </span>
        </td>
        <td class="text-muted">₹ ${stockValue}</td>
        <td class="text-right table-actions">
          <button class="btn btn-sm btn-outline btn-edit" data-id="${product.id}" title="Edit Product">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${product.id}" title="Delete Product">
            🗑️ Delete
          </button>
        </td>
      `;

      // Event listeners for edit & delete buttons
      row.querySelector('.btn-edit').addEventListener('click', () => this.editProduct(product.id));
      row.querySelector('.btn-delete').addEventListener('click', () => this.deleteProduct(product.id));

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

window.Products = Products;
