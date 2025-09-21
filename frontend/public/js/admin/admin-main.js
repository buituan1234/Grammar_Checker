/**
 * admin-main.js
 * Main initialization and entry point
 */

'use strict';

// Main admin panel initialization
const AdminMain = {
  // Initialize the entire admin panel
  async init() {
    try {
      log('Initializing Enhanced Admin Panel v8.0.0 (Complete Modular System)...');
      
      // Step 1: Validate authentication
      if (!validateAuthentication()) {
        return;
      }
      
      // Step 2: Initialize DOM elements
      initializeElements();
      
      // Step 3: Setup event listeners
      initializeEventListeners();
      
      // Step 4: Setup input fixes and styling
      setupInputFixes();
      setupPasswordToggle();
      
      // Step 5: Update admin info in header
      const userData = getUserData();
      if (userData && elements.adminUsername) {
        elements.adminUsername.textContent = userData.username || 'admin';
      }
      
      // Step 6: Load initial data
      await loadUsers();
      
      // Step 7: Show welcome notification
      if (userData) {
        showToast('Admin Panel Ready', `Welcome ${userData.username}! Complete modular system loaded.`, 'success', 3000);
      }
      
      // Step 8: Setup auto-refresh (optional)
      this.setupAutoRefresh();
      
      log('Enhanced admin panel initialization complete');
      
    } catch (error) {
      log('Initialization failed', error, 'error');
      showError('Initialization failed: ' + error.message);
    }
  },

  // Setup auto-refresh functionality
  setupAutoRefresh() {
    if (CONFIG.AUTO_REFRESH_INTERVAL > 0) {
      AppState.autoRefreshTimer = setInterval(() => {
        // Only refresh if not in edit mode and not loading
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

  // Setup legacy globals for backward compatibility
  setupLegacyGlobals() {
    // Export AdminPanel object
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

  // Handle page unload
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

  // Development mode setup
  setupDevelopmentMode() {
    if (CONFIG.DEBUG_MODE || window.location.hostname === 'localhost') {
      // Add development helpers
      window.dev = {
        loadMockData: () => {
          const mockUsers = [
            { id: 1, username: 'admin', fullName: 'System Admin', email: 'admin@test.com', role: 'admin', accountType: 'plus', status: 'active' },
            { id: 2, username: 'user1', fullName: 'Test User 1', email: 'user1@test.com', role: 'user', accountType: 'free', status: 'active' },
            { id: 3, username: 'user2', fullName: 'Test User 2', email: 'user2@test.com', role: 'user', accountType: 'plus', status: 'inactive' }
          ];
          AdminState.setUsers(mockUsers);
          updateStatistics();
          renderUserTable();
          showToast('Development', 'Mock data loaded', 'info', 2000);
        },
        
        resetApp: () => {
          AdminState.setUsers([]);
          updateStatistics();
          renderUserTable();
          showToast('Development', 'App state reset', 'info', 2000);
        },
        
        testToasts: () => {
          showToast('Success', 'This is a success message', 'success', 3000);
          setTimeout(() => showToast('Error', 'This is an error message', 'error', 3000), 500);
          setTimeout(() => showToast('Warning', 'This is a warning message', 'warning', 3000), 1000);
          setTimeout(() => showToast('Info', 'This is an info message', 'info', 3000), 1500);
        },
        
        simulateError: () => {
          throw new Error('Simulated error for testing');
        }
      };
      
      console.log('Development mode enabled. Use window.dev for dev helpers:', window.dev);
    }
  }
};

// Initialize when DOM is loaded
function initializeAdminPanel() {
  AdminMain.addCSSAnimations();
  AdminMain.setupLegacyGlobals();
  AdminMain.setupDevelopmentMode();
  AdminMain.init();
  window.addEventListener('beforeunload', AdminMain.cleanup);
}

// Auto-start based on document ready state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
  initializeAdminPanel();
}

// Global export
if (typeof window !== 'undefined') {
  window.AdminMain = AdminMain;
}

// Final initialization log
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