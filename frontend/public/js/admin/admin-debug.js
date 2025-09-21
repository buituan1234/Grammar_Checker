/**
 * admin-debug.js
 * Debug helpers and development tools
 */

'use strict';

// Debug management functions
const AdminDebug = {
  // Debug authentication
  debugAuth() {
    console.log('=== Authentication Debug ===');
    console.log('Admin Storage Key:', CONFIG.ADMIN_STORAGE_KEY);
    console.log('User Storage Key:', CONFIG.USER_STORAGE_KEY);
    console.log('Legacy Storage Key:', CONFIG.LEGACY_STORAGE_KEY);
    console.log('Raw Admin Storage:', localStorage.getItem(CONFIG.ADMIN_STORAGE_KEY));
    console.log('Raw User Storage:', localStorage.getItem(CONFIG.USER_STORAGE_KEY));
    console.log('Raw Legacy Storage:', localStorage.getItem(CONFIG.LEGACY_STORAGE_KEY));
    console.log('Admin Token:', localStorage.getItem('admin_token'));
    console.log('Parsed User Data:', getUserData());
    console.log('Is Admin Panel:', isAdminPanel());
    console.log('==============================');
  },

  // Debug storage state
  debugStorage() {
    console.log('=== Storage Debug ===');
    console.log('Is Admin Panel:', isAdminPanel());
    console.log('Admin Storage:', localStorage.getItem(CONFIG.ADMIN_STORAGE_KEY));
    console.log('User Storage:', localStorage.getItem(CONFIG.USER_STORAGE_KEY));
    console.log('Legacy Storage:', localStorage.getItem(CONFIG.LEGACY_STORAGE_KEY));
    console.log('Current User:', getUserData());
    console.log('Storage Key Function Test:', getStorageKey('admin'), getStorageKey('user'));
    console.log('====================');
  },

  // Debug form state
  debugForm() {
    console.log('=== Form Debug ===');
    console.log('Edit Mode:', AppState.isEditMode);
    console.log('Editing User ID:', AppState.currentEditingUserId);
    
    if (AppState.currentEditingUserId) {
      const user = AdminState.getUserById(AppState.currentEditingUserId);
      console.log('User Being Edited:', user);
    }
    
    console.log('Form Elements:', {
      username: elements.username?.value,
      email: elements.email?.value,
      fullName: elements.fullName?.value,
      isActive: elements.isActive?.checked,
      isPlusAccount: elements.isPlusAccount?.checked,
      isAdmin: elements.isAdmin?.checked
    });
    
    try {
      console.log('Form Data:', getFormData());
    } catch (error) {
      console.log('Form Data Error:', error);
    }
    
    console.log('==================');
  },

  // Debug app state
  debugAppState() {
    console.log('=== App State Debug ===');
    console.log('All Users Count:', AppState.allUsers.length);
    console.log('Filtered Users Count:', AppState.filteredUsers.length);
    console.log('Edit Mode:', AppState.isEditMode);
    console.log('Current Editing User ID:', AppState.currentEditingUserId);
    console.log('Loading State:', AppState.isLoading);
    console.log('Debug Mode:', AppState.isDebugMode);
    console.log('Search Term:', elements.searchInput?.value);
    
    if (AppState.allUsers.length > 0) {
      console.log('First User Sample:', AppState.allUsers[0]);
      
      const stats = {
        total: AppState.allUsers.length,
        active: AppState.allUsers.filter(u => u.status === 'active').length,
        inactive: AppState.allUsers.filter(u => u.status === 'inactive').length,
        plus: AppState.allUsers.filter(u => u.accountType === 'plus').length,
        free: AppState.allUsers.filter(u => u.accountType === 'free').length,
        admin: AppState.allUsers.filter(u => u.role === 'admin').length
      };
      console.log('User Statistics:', stats);
    }
    
    console.log('========================');
  },

  // Clear all sessions
  clearAllSessions() {
    localStorage.removeItem(CONFIG.ADMIN_STORAGE_KEY);
    localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
    localStorage.removeItem(CONFIG.LEGACY_STORAGE_KEY);
    localStorage.removeItem('admin_token');
    console.log('All sessions cleared');
    showToast('Debug', 'All sessions cleared', 'info', 2000);
  },

  // Set temporary admin data for testing
  setTempAdminData() {
    const tempAdminData = {
      userId: 999,
      username: 'debug_admin',
      userRole: 'admin',
      email: 'debug@admin.com',
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem(CONFIG.ADMIN_STORAGE_KEY, JSON.stringify(tempAdminData));
    console.log('Temporary admin data set:', tempAdminData);
    showToast('Debug', 'Temporary admin data set', 'info', 2000);
    return tempAdminData;
  },

  // Test API endpoints
  async testAPIEndpoints() {
    console.log('=== API Endpoints Test ===');
    
    const endpoints = [
      { url: `${CONFIG.API_BASE_URL}/admin/users`, method: 'GET', description: 'Load Users' },
      { url: `${CONFIG.API_BASE_URL}/users/register`, method: 'POST', description: 'Create User' },
      { url: `${CONFIG.API_BASE_URL}/users/admin/update/1`, method: 'PUT', description: 'Update User' },
      { url: `${CONFIG.API_BASE_URL}/users/admin/delete/1`, method: 'DELETE', description: 'Delete User' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.description}...`);
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        });
        console.log(`${endpoint.description}:`, response.status, response.statusText);
      } catch (error) {
        console.log(`${endpoint.description} Error:`, error.message);
      }
    }
    
    console.log('=============================');
  },

  // Performance monitoring
  startPerformanceMonitoring() {
    const originalFetch = window.fetch;
    let requestCount = 0;
    let totalTime = 0;
    
    window.fetch = function(...args) {
      const startTime = performance.now();
      requestCount++;
      
      console.log(`[API Request #${requestCount}]`, args[0]);
      
      return originalFetch.apply(this, args)
        .then(response => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          totalTime += duration;
          
          console.log(`[API Response #${requestCount}]`, {
            status: response.status,
            duration: `${duration.toFixed(2)}ms`,
            avgDuration: `${(totalTime / requestCount).toFixed(2)}ms`
          });
          
          return response;
        })
        .catch(error => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          console.log(`[API Error #${requestCount}]`, {
            error: error.message,
            duration: `${duration.toFixed(2)}ms`
          });
          
          throw error;
        });
    };
    
    console.log('Performance monitoring started');
    showToast('Debug', 'Performance monitoring started', 'info', 2000);
  },

  // Export debug data
  exportDebugData() {
    const debugData = {
      timestamp: new Date().toISOString(),
      appState: {
        allUsers: AppState.allUsers.length,
        filteredUsers: AppState.filteredUsers.length,
        isEditMode: AppState.isEditMode,
        currentEditingUserId: AppState.currentEditingUserId,
        isLoading: AppState.isLoading,
        isDebugMode: AppState.isDebugMode
      },
      storage: {
        adminStorage: localStorage.getItem(CONFIG.ADMIN_STORAGE_KEY),
        userStorage: localStorage.getItem(CONFIG.USER_STORAGE_KEY),
        legacyStorage: localStorage.getItem(CONFIG.LEGACY_STORAGE_KEY),
        adminToken: localStorage.getItem('admin_token')
      },
      config: CONFIG,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const dataStr = JSON.stringify(debugData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-debug-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Debug data exported');
    showToast('Debug', 'Debug data exported to file', 'success', 2000);
  }
};

// Global debug functions for easy access in console
function debugAuth() {
  AdminDebug.debugAuth();
}

function debugStorage() {
  AdminDebug.debugStorage();
}

function debugForm() {
  AdminDebug.debugForm();
}

function debugAppState() {
  AdminDebug.debugAppState();
}

function clearAllSessions() {
  AdminDebug.clearAllSessions();
}

function setTempAdminData() {
  return AdminDebug.setTempAdminData();
}

// Global exports and console helpers
if (typeof window !== 'undefined') {
  window.AdminDebug = AdminDebug;
  window.debugAuth = debugAuth;
  window.debugStorage = debugStorage;
  window.debugForm = debugForm;
  window.debugAppState = debugAppState;
  window.clearAllSessions = clearAllSessions;
  window.setTempAdminData = setTempAdminData;
  
  // Quick debug shortcuts
  window.d = {
    auth: debugAuth,
    storage: debugStorage,
    form: debugForm,
    state: debugAppState,
    clear: clearAllSessions,
    temp: setTempAdminData,
    export: () => AdminDebug.exportDebugData(),
    api: () => AdminDebug.testAPIEndpoints(),
    perf: () => AdminDebug.startPerformanceMonitoring()
  };
  
  console.log('Debug helpers loaded. Use window.d for shortcuts:', window.d);
}