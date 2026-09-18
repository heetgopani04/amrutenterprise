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
    const infoEl = document.getElementById('auth-info-msg');
    const forgotNotice = document.getElementById('auth-forgot-notice');

    if (errorEl) errorEl.style.display = 'none';
    if (infoEl) infoEl.style.display = 'none';
    if (forgotNotice) forgotNotice.style.display = 'none';
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
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const tabLogin = document.getElementById('tab-btn-login');
    const tabSignup = document.getElementById('tab-btn-signup');
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');
    const linkForgotPassword = document.getElementById('link-forgot-password');
    const forgotNotice = document.getElementById('auth-forgot-notice');
    const closeForgotNotice = document.getElementById('btn-close-forgot-notice');
    const subtitleEl = document.getElementById('auth-header-subtitle');

    const sidebarLogoutBtn = document.getElementById('btn-sidebar-logout');
    const topLogoutBtn = document.getElementById('btn-top-logout');
    const settingsLogoutBtn = document.getElementById('btn-settings-logout');
    const errorEl = document.getElementById('auth-error-msg');
    const infoEl = document.getElementById('auth-info-msg');

    const showMsg = (msg, isError = true) => {
      if (isError) {
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.style.display = 'block';
        }
        if (infoEl) infoEl.style.display = 'none';
      } else {
        if (infoEl) {
          infoEl.textContent = msg;
          infoEl.style.display = 'block';
        }
        if (errorEl) errorEl.style.display = 'none';
      }
    };

    const clearMsg = () => {
      if (errorEl) errorEl.style.display = 'none';
      if (infoEl) infoEl.style.display = 'none';
    };

    // Mode switching function (Login vs Signup)
    const setAuthMode = (mode) => {
      clearMsg();
      if (forgotNotice) forgotNotice.style.display = 'none';

      if (mode === 'signup') {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'flex';
        if (tabSignup) tabSignup.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (subtitleEl) subtitleEl.textContent = 'Create an account to manage your store';
      } else {
        if (loginForm) loginForm.style.display = 'flex';
        if (signupForm) signupForm.style.display = 'none';
        if (tabLogin) tabLogin.classList.add('active');
        if (tabSignup) tabSignup.classList.remove('active');
        if (subtitleEl) subtitleEl.textContent = 'Sign in to manage your inventory and sales';
      }
    };

    if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
    if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode('signup'));
    if (switchToSignup) switchToSignup.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('signup'); });
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('login'); });

    // Forgot Password notice toggle
    if (linkForgotPassword) {
      linkForgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        if (forgotNotice) {
          forgotNotice.style.display = forgotNotice.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    if (closeForgotNotice) {
      closeForgotNotice.addEventListener('click', () => {
        if (forgotNotice) forgotNotice.style.display = 'none';
      });
    }

    // Password show/hide toggle helper
    const setupPasswordToggle = (toggleBtnId, inputId) => {
      const btn = document.getElementById(toggleBtnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.addEventListener('click', () => {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.textContent = isPassword ? '🙈' : '👁️';
          btn.title = isPassword ? 'Hide Password' : 'Show Password';
        });
      }
    };

    setupPasswordToggle('toggle-login-password', 'auth-password-input');
    setupPasswordToggle('toggle-signup-password', 'signup-password-input');
    setupPasswordToggle('toggle-signup-confirm-password', 'signup-confirm-password-input');

    // 1. Handle Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMsg();

        const phoneInput = document.getElementById('auth-phone-input');
        const passwordInput = document.getElementById('auth-password-input');
        const submitBtn = document.getElementById('btn-auth-submit');

        const phone = phoneInput ? phoneInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!phone) {
          showMsg('Please enter your phone number.');
          return;
        }

        if (!password) {
          showMsg('Please enter your password.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳ Signing In...</span>';
        }

        try {
          await Storage.login(phone, password);
          clearMsg();
          await this.launchApp();
        } catch (err) {
          console.error('Login error:', err);
          showMsg(err.message || 'Invalid phone or password.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>🚀 Sign In</span>';
          }
        }
      });
    }

    // 2. Handle Sign Up Form Submit
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMsg();

        const nameInput = document.getElementById('signup-name-input');
        const phoneInput = document.getElementById('signup-phone-input');
        const passwordInput = document.getElementById('signup-password-input');
        const confirmPasswordInput = document.getElementById('signup-confirm-password-input');
        const submitBtn = document.getElementById('btn-signup-submit');

        const name = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

        if (!phone) {
          showMsg('Please enter your phone number.');
          return;
        }

        if (!password) {
          showMsg('Please enter a password.');
          return;
        }

        if (password.length < 6) {
          showMsg('Password must be at least 6 characters.');
          return;
        }

        if (password !== confirmPassword) {
          showMsg('Password and Confirm Password must match.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳ Creating Account...</span>';
        }

        try {
          await Storage.signup(phone, name, password, confirmPassword);
          clearMsg();
          await this.launchApp();
        } catch (err) {
          console.error('Signup error:', err);
          showMsg(err.message || 'Failed to create account. Please try again.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>✨ Create Account & Sign In</span>';
          }
        }
      });
    }

    // Handle Logout
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
