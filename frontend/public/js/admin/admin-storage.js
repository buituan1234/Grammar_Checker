/**
 * admin-storage.js
 * Storage management with separate keys for admin and user
 */

'use strict';

// Storage management functions
const AdminStorage = {
  // Get storage key based on user role
  getStorageKey(userRole) {
    return userRole === 'admin' ? CONFIG.ADMIN_STORAGE_KEY : CONFIG.USER_STORAGE_KEY;
  },

  // Set user data with appropriate storage key
  setUserData(userData) {
    try {
      const storageKey = this.getStorageKey(userData.userRole);
      const dataToStore = {
        userId: userData.userId || userData.user?.id || userData.id,
        username: userData.username || userData.user?.username,
        userRole: userData.userRole || userData.user?.role || userData.role,
        email: userData.email || userData.user?.email,
        phone: userData.phone || userData.user?.phone || '',
        fullName: userData.fullName || userData.user?.fullName || userData.name,
        loginTime: new Date().toISOString()
      };
      
      // Validate required fields
      if (!dataToStore.userId || !dataToStore.username || !dataToStore.userRole) {
        throw new Error('Incomplete user data');
      }
      
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      
      // Cleanup: remove legacy storage and other role's data
      localStorage.removeItem(CONFIG.LEGACY_STORAGE_KEY);
      if (userData.userRole === 'admin') {
        localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
      } else {
        localStorage.removeItem(CONFIG.ADMIN_STORAGE_KEY);
      }
      
      log(`User data stored with key: ${storageKey}`, dataToStore);
      return dataToStore;
    } catch (error) {
      log('Error storing user data', error, 'error');
      throw error;
    }
  },

  // Get user data for current context
  getUserData() {
    try {
      let userData = null;
      let storageKey = null;
      
      if (isAdminPanel()) {
        // On admin panel, try admin storage first
        storageKey = CONFIG.ADMIN_STORAGE_KEY;
        const adminData = localStorage.getItem(storageKey);
        if (adminData) {
          userData = JSON.parse(adminData);
          log('Retrieved admin data from admin storage', userData);
        }
      } else {
        // On user pages, try user storage first
        storageKey = CONFIG.USER_STORAGE_KEY;
        const regularUserData = localStorage.getItem(storageKey);
        if (regularUserData) {
          userData = JSON.parse(regularUserData);
          log('Retrieved user data from user storage', userData);
        }
      }
      
      // If no data found in appropriate storage, try legacy migration
      if (!userData) {
        userData = this.migrateLegacyData();
      }
      
      // Validate user data
      if (userData) {
        if (!userData.username || !userData.userRole) {
          log('Invalid user data structure', userData, 'warn');
          return null;
        }
        
        // On admin panel, ensure user is admin
        if (isAdminPanel() && userData.userRole !== 'admin') {
          log('Non-admin user trying to access admin panel', userData, 'warn');
          return null;
        }
      }
      
      return userData;
    } catch (error) {
      log('Error parsing user data from localStorage', error, 'error');
      return null;
    }
  },

  // Migrate from legacy storage format
  migrateLegacyData() {
    try {
      const legacyData = localStorage.getItem(CONFIG.LEGACY_STORAGE_KEY);
      if (!legacyData) return null;
      
      const userData = JSON.parse(legacyData);
      if (!userData.userRole) return null;
      
      log('Migrating legacy data', userData);
      
      // Store in appropriate new location
      const newStorageKey = this.getStorageKey(userData.userRole);
      localStorage.setItem(newStorageKey, legacyData);
      
      // Remove legacy data
      localStorage.removeItem(CONFIG.LEGACY_STORAGE_KEY);
      
      log(`Legacy data migrated to: ${newStorageKey}`);
      return userData;
    } catch (error) {
      log('Error migrating legacy data', error, 'error');
      return null;
    }
  },

  // Clear user data
  clearUserData(userRole) {
    const storageKey = this.getStorageKey(userRole);
    localStorage.removeItem(storageKey);
    localStorage.removeItem('admin_token');
    log(`Cleared data for role: ${userRole}`);
  },

  // Check if current user is admin
  isCurrentUserAdmin() {
    const userData = this.getUserData();
    return userData && userData.userRole === 'admin';
  }
};

// Storage change monitoring
function monitorStorageChanges() {
  window.addEventListener('storage', function(e) {
    // Only react to changes in our storage keys
    if (e.key === CONFIG.ADMIN_STORAGE_KEY || e.key === CONFIG.USER_STORAGE_KEY || e.key === CONFIG.LEGACY_STORAGE_KEY) {
      log('Storage change detected', { key: e.key, newValue: e.newValue ? 'Data present' : 'Data removed' });
      
      // Check if our authentication is still valid
      const currentUser = AdminStorage.getUserData();
      if (!currentUser && isAdminPanel()) {
        showToast('Session Changed', 'Admin session was modified in another tab', 'warning', 3000);
      }
    }
  });
  
  log('Storage monitoring initialized');
}

// Legacy wrapper functions for backward compatibility
function getUserData() {
  return AdminStorage.getUserData();
}

function setUserData(userData) {
  return AdminStorage.setUserData(userData);
}

function getStorageKey(userRole) {
  return AdminStorage.getStorageKey(userRole);
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminStorage = AdminStorage;
  window.getUserData = getUserData;
  window.setUserData = setUserData;
  window.getStorageKey = getStorageKey;
  window.monitorStorageChanges = monitorStorageChanges;
}