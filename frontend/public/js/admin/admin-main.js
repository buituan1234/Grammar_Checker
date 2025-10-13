'use strict';

// Main admin panel initialization
const AdminMain = {
  async init() {
    try {
      log('Initializing Enhanced Admin Panel v8.0.0 (Complete Modular System)...');
      
      if (!validateAuthentication()) {
        return;
      }
      
      initializeElements();
      initializeEventListeners();
      setupInputFixes();
      setupPasswordToggle();
      
      const userData = AuthManager.getCurrentUser();
      if (userData && elements.adminUsername) {
        elements.adminUsername.textContent = userData.username || 'admin';
      }
      
      await loadUsers();
      if (userData) {
        showToast('Admin Panel Ready', `Welcome ${userData.username}! Complete modular system loaded.`, 'success', 3000);
      }
      
      this.setupAutoRefresh();
      
      log('Enhanced admin panel initialization complete');
      
    } catch (error) {
      log('Initialization failed', error, 'error');
      showError('Initialization failed: ' + error.message);
    }
  },

  setupDevelopmentMode() {
    if (CONFIG.DEBUG_MODE) {
      console.log('🛠️ Development Mode Enabled');
      console.log('Debug commands:', {
        'd.auth()': 'Debug authentication',
        'd.storage()': 'Debug localStorage',
        'd.form()': 'Debug form state',
        'd.state()': 'Debug app state',
        'd.clear()': 'Clear all sessions',
        'd.temp()': 'Set temp admin data',
        'd.export()': 'Export debug data',
        'd.api()': 'Test API endpoints',
        'd.perf()': 'Monitor performance'
      });
    }
  },
  
  // Setup auto-refresh functionality
  setupAutoRefresh() {
    if (CONFIG.AUTO_REFRESH_INTERVAL > 0) {
      AppState.autoRefreshTimer = setInterval(() => {
        if (!AppState.isEditMode && !AppState.isLoading) {
          log('Auto-refresh triggered');
          loadUsers();
        }
      }, CONFIG.AUTO_REFRESH_INTERVAL);
      
      log(`Auto-refresh setup: every ${CONFIG.AUTO_REFRESH_INTERVAL / 1000} seconds`);
    }
  },

  // Add CSS animations
  addCSSAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }
      
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .modal.show {
        animation: fadeIn 0.3s ease-out;
      }
      
      .toast {
        animation: fadeIn 0.3s ease-out;
      }
      
      .loading-spinner .spinner {
        animation: spin 1s linear infinite;
      }
      
      .btn:hover {
        transform: translateY(-1px);
        transition: transform 0.2s ease;
      }
      
      .btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
    log('CSS animations added');
  },

  setupLegacyGlobals() {
    window.AdminPanel = {
      init: this.init.bind(this),
      loadUsers,
      showAddUserModal,
      showEditUserModal,
      deleteUser,
      toggleDebug,
      handleLogout,
      exportUsers,
      log,
      AppState,
      CONFIG,
      AdminAPI,
      AdminAuth,
      AdminUI,
      AdminForms,
      AdminModals,
      AdminEvents,
      AdminDebug,
      AdminStorage
    };
    
    log('Legacy globals setup for backward compatibility');
  },

  cleanup() {
    if (AppState.autoRefreshTimer) {
      clearInterval(AppState.autoRefreshTimer);
      AppState.autoRefreshTimer = null;
    }
    
    if (AppState.searchTimeout) {
      clearTimeout(AppState.searchTimeout);
      AppState.searchTimeout = null;
    }
    
    log('Admin panel cleanup completed');
  },
};

function initializeAdminPanel() {
  if (typeof AuthManager === 'undefined') {
    console.error('❌ CRITICAL: AuthManager not loaded! Cannot initialize admin panel.');
    alert('Authentication system failed to load. Please refresh the page.');
    return;
  }
  
  AdminMain.addCSSAnimations();
  AdminMain.setupLegacyGlobals();
  AdminMain.setupDevelopmentMode();
  AdminMain.init();
  window.addEventListener('beforeunload', AdminMain.cleanup);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
  initializeAdminPanel();
}

if (typeof window !== 'undefined') {
  window.AdminMain = AdminMain;
}

log('Admin panel main script loaded successfully', { 
  version: '8.0.0', 
  features: [
    'Complete Modular Architecture',
    'Separate Storage Keys', 
    'Immediate UI Updates',
    'No Function Conflicts',
    'Enhanced Error Handling',
    'Debug Tools',
    'Development Helpers'
  ],
  timestamp: new Date().toISOString() 
});