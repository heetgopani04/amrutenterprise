// ==========================================
// SETTINGS MODULE - Store Details & Reset Data
// ==========================================

const Settings = {
  init() {
    this.loadSettings();
    this.bindEvents();
  },

  bindEvents() {
    const settingsForm = document.getElementById('settings-form');
    const resetBtn = document.getElementById('btn-reset-all-data');

    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleResetData());
    }
  },

  // Load saved store details into inputs
  loadSettings() {
    const settings = Storage.getSettings();
    const user = Storage.getUser();

    const nameInput = document.getElementById('setting-store-name');
    const ownerInput = document.getElementById('setting-owner-name');
    const addressInput = document.getElementById('setting-store-address');
    const phoneInput = document.getElementById('setting-store-phone');
    const brandHeader = document.getElementById('brand-store-name');

    const accountName = document.getElementById('settings-account-name');
    const accountPhone = document.getElementById('settings-account-phone');

    if (user) {
      if (accountName) accountName.textContent = user.name || settings.ownerName || 'Store Owner';
      if (accountPhone) accountPhone.textContent = `Phone: ${user.phone}`;
    }

    if (nameInput) nameInput.value = settings.storeName || '';
    if (ownerInput) ownerInput.value = settings.ownerName || '';
    if (addressInput) addressInput.value = settings.address || '';
    if (phoneInput) phoneInput.value = settings.phone || (user ? user.phone : '');

    if (brandHeader) {
      brandHeader.textContent = settings.storeName || 'Amrut Enterprise';
    }
  },

  // Save store details form
  handleSaveSettings(e) {
    e.preventDefault();

    const storeName = document.getElementById('setting-store-name').value.trim();
    const ownerName = document.getElementById('setting-owner-name').value.trim();
    const address = document.getElementById('setting-store-address').value.trim();
    const phone = document.getElementById('setting-store-phone').value.trim();

    const settings = {
      storeName,
      ownerName,
      address,
      phone
    };

    Storage.saveSettings(settings);

    // Update brand in header/sidebar
    const brandHeader = document.getElementById('brand-store-name');
    if (brandHeader) {
      brandHeader.textContent = storeName || 'Amrut Enterprise';
    }

    if (window.App && typeof App.updateUserDisplay === 'function') {
      App.updateUserDisplay();
    }

    const toast = document.getElementById('settings-success-msg');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    } else {
      alert('Store settings saved successfully!');
    }
  },

  // Reset All Data with confirm popup
  async handleResetData() {
    const user = Storage.getUser();
    const phone = user ? user.phone : 'this account';

    const confirmed = confirm(
      `⚠️ WARNING: Are you sure you want to RESET ALL STORE DATA for ${phone}?\n\nThis will permanently delete all products, customers, sales history, and store settings from the Postgres database. This action cannot be undone!`
    );

    if (!confirmed) return;

    const secondConfirm = confirm('Please confirm once more: Clear all cloud records and restart empty?');
    if (!secondConfirm) return;

    await Storage.resetAllData();

    alert('All store data has been reset successfully. Reloading application...');
    window.location.reload();
  }
};

window.Settings = Settings;
