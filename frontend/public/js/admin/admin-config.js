/**
 * admin-config.js
 * Configuration and constants for admin panel
 */

'use strict';

const CONFIG = {
  API_BASE_URL: window.location.origin + '/api',
  ADMIN_STORAGE_KEY: 'loggedInAs_admin',
  USER_STORAGE_KEY: 'loggedInAs_user', 
  DEBUG_MODE: true,
  AUTO_REFRESH_INTERVAL: 3000000, 
  NOTIFICATION_DURATION: 5000,
  SEARCH_DEBOUNCE_DELAY: 300
};

// Export for global access
if (typeof window !== 'undefined') {
  window.AdminConfig = CONFIG;
}