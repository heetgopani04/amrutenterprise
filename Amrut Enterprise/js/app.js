// ==========================================
// APP MODULE - Main Initialization, Auth Flow & Navigation
// ==========================================

const App = {
  activeTab: 'dashboard',

  async init() {
    this.bindAuthEvents();
    this.bindNavigation();

    // Check if user is logged in
    if (Storage.isLoggedIn()) {
      await this.launchApp();
    } else {
      this.showAuthScreen();
    }
  },

  // Show authentication screen
  showAuthScreen() {
    const authOverlay = document.getElementById('auth-overlay');
    const appLayout = document.getElementById('app-layout');
    const errorEl = document.getElementById('auth-error-msg');

    if (errorEl) errorEl.style.display = 'none';
    if (authOverlay) authOverlay.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
  },

  // Hide auth screen and start app
  async launchApp() {
    const authOverlay = document.getElementById('auth-overlay');
    const appLayout = document.getElementById('app-layout');

    if (authOverlay) authOverlay.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';

    // Update user profile display in UI
    this.updateUserDisplay();

    // Fetch fresh data from Neon Postgres
    await Storage.fetchAll();

    // Initialize all app modules
    this.initModules();

    // Navigate to dashboard
    this.switchTab('dashboard');
  },

  // Update user name/phone in header and sidebar
  updateUserDisplay() {
    const user = Storage.getUser();
    if (!user) return;

    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarPhone = document.getElementById('sidebar-user-phone');
    const topbarPhone = document.getElementById('topbar-user-phone');
    const settingsName = document.getElementById('settings-account-name');
    const settingsPhone = document.getElementById('settings-account-phone');
    const brandStoreName = document.getElementById('brand-store-name');

    const settings = Storage.getSettings();
    const displayName = user.name || settings.ownerName || 'Store Owner';

    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarPhone) sidebarPhone.textContent = user.phone;
    if (topbarPhone) topbarPhone.textContent = `${user.phone}`;
    if (settingsName) settingsName.textContent = displayName;
    if (settingsPhone) settingsPhone.textContent = `Phone: ${user.phone}`;
    if (brandStoreName) brandStoreName.textContent = settings.storeName || `${displayName}'s Store`;
  },

  // Bind Login / Logout events
  bindAuthEvents() {
    const authForm = document.getElementById('auth-login-form');
    const sidebarLogoutBtn = document.getElementById('btn-sidebar-logout');
    const topLogoutBtn = document.getElementById('btn-top-logout');
    const settingsLogoutBtn = document.getElementById('btn-settings-logout');
    const errorEl = document.getElementById('auth-error-msg');
    const submitBtn = document.getElementById('btn-auth-submit');

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneInput = document.getElementById('auth-phone-input');
        const nameInput = document.getElementById('auth-name-input');

        const phone = phoneInput ? phoneInput.value.trim() : '';
        const name = nameInput ? nameInput.value.trim() : '';

        if (!phone) {
          if (errorEl) {
            errorEl.textContent = 'Please enter your phone number.';
            errorEl.style.display = 'block';
          }
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳ Connecting to Neon DB...</span>';
        }

        try {
          await Storage.login(phone, name);
          if (errorEl) errorEl.style.display = 'none';
          await this.launchApp();
        } catch (err) {
          console.error('Login error:', err);
          if (errorEl) {
            errorEl.textContent = err.message || 'Login failed. Please check your connection.';
            errorEl.style.display = 'block';
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>🚀 Sign In / Open Store</span>';
          }
        }
      });
    }

    const handleLogout = () => {
      if (confirm('Are you sure you want to sign out?')) {
        Storage.logout();
        this.showAuthScreen();
      }
    };

    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);
    if (topLogoutBtn) topLogoutBtn.addEventListener('click', handleLogout);
    if (settingsLogoutBtn) settingsLogoutBtn.addEventListener('click', handleLogout);
  },

  // Initialize all sub-modules
  initModules() {
    if (typeof Products !== 'undefined' && typeof Products.init === 'function') {
      Products.init();
    }
    if (typeof Customers !== 'undefined' && typeof Customers.init === 'function') {
      Customers.init();
    }
    if (typeof Sales !== 'undefined' && typeof Sales.init === 'function') {
      Sales.init();
    }
    if (typeof Settings !== 'undefined' && typeof Settings.init === 'function') {
      Settings.init();
    }
    if (typeof Dashboard !== 'undefined' && typeof Dashboard.init === 'function') {
      Dashboard.init();
    }
  },

  // Navigation click handling
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-link');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
          // Close mobile sidebar if open
          if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
          }
        }
      });
    });

    // Mobile menu toggle
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }
  },

  // Switch visible page/tab
  switchTab(tabName) {
    this.activeTab = tabName;

    // Update active class on nav links
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update visible view sections
    const views = document.querySelectorAll('.view-section');
    views.forEach(view => {
      if (view.id === `view-${tabName}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Refresh module data depending on active tab
    switch (tabName) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined' && typeof Dashboard.render === 'function') Dashboard.render();
        break;
      case 'products':
        if (typeof Products !== 'undefined') {
          if (typeof Products.populateCategoryFilter === 'function') Products.populateCategoryFilter();
          if (typeof Products.render === 'function') Products.render();
        }
        break;
      case 'customers':
        if (typeof Customers !== 'undefined' && typeof Customers.render === 'function') Customers.render();
        break;
      case 'sales':
        if (typeof Sales !== 'undefined') {
          if (typeof Sales.populateCustomerDropdown === 'function') Sales.populateCustomerDropdown();
          if (typeof Sales.renderSalesList === 'function') Sales.renderSalesList();
        }
        break;
      case 'settings':
        if (typeof Settings !== 'undefined' && typeof Settings.loadSettings === 'function') Settings.loadSettings();
        break;
    }
  }
};

window.App = App;

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
