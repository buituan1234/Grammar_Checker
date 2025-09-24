/**
 * admin-auth.js
 * Authentication and authorization functions
 */

'use strict';

// Authentication management
const AdminAuth = {
  validateAuthentication() {
    const userData = getUserData();
    
    if (!userData) {
      log('No authentication data found', null, 'warn');
      
      if (isAdminPanel()) {
        showToast('Admin Access Required', 'Please login with admin credentials to access this panel', 'error', 3000);
      } else {
        showToast('Authentication Required', 'Please login to access this page', 'error', 3000);
      }
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
      return false;
    }
    
    if (isAdminPanel() && userData.userRole.toLowerCase() !== 'admin') {
      log('Non-admin user trying to access admin panel', userData, 'error');
      showToast('Access Denied', 'Admin privileges required for this panel', 'error', 3000);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
      return false;
    }
    
    log('Authentication validated successfully', { 
      userRole: userData.userRole, 
      username: userData.username,
      isAdminPanel: isAdminPanel()
    });
    return true;
  },

  // Make authenticated API request
  async makeAuthenticatedRequest(url, options = {}) {
    const userData = getUserData();
    
    if (!userData) {
      log('No user data available for authentication', null, 'error');
      throw new Error('Authentication required. Please login again.');
    }
    
    if (isAdminPanel() && userData.userRole !== 'admin') {
      log('Non-admin user trying to access admin functionality', userData, 'error');
      throw new Error('Admin privileges required for this operation.');
    }
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'x-user-role': userData.userRole,
      'x-user-id': userData.userId || userData.id,
      'x-username': userData.username
    };
    
    // Add admin token if available
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      defaultHeaders['Authorization'] = `Bearer ${adminToken}`;
    }
    
    const requestOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };
    
    log(`Making authenticated API request to: ${url}`, { 
      method: options.method || 'GET', 
      userRole: userData.userRole,
      storageKey: getStorageKey(userData.userRole)
    });
    
    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();
      
      log(`API response received`, { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(data.error || 'Access denied. Insufficient privileges.');
        }
        if (response.status === 401) {
          // Clear appropriate storage
          const storageKey = getStorageKey(userData.userRole);
          localStorage.removeItem(storageKey);
          localStorage.removeItem('admin_token');
          throw new Error('Authentication expired. Please login again.');
        }
        throw new Error(data.error || `API request failed with status ${response.status}`);
      }
      
      return data;
    } catch (networkError) {
      log('Network error in authenticated request', networkError, 'error');
      throw new Error(`Network error: ${networkError.message}`);
    }
  },

  // Login user with role-based storage
  loginUser(loginResponse) {
    try {
      const userData = {
        userId: loginResponse.userId || loginResponse.user?.id || loginResponse.id,
        username: loginResponse.username || loginResponse.user?.username,
        userRole: loginResponse.userRole || loginResponse.user?.role || loginResponse.role,
        email: loginResponse.email || loginResponse.user?.email,
        phone: loginResponse.phone || loginResponse.user?.phone || '',
        fullName: loginResponse.fullName || loginResponse.user?.fullName || loginResponse.name
      };
      
      // Validate required fields
      if (!userData.userId || !userData.username || !userData.userRole) {
        throw new Error('Incomplete login data received');
      }
      
      // Store with appropriate key
      const storedData = setUserData(userData);
      
      log(`User logged in with role: ${userData.userRole}`, storedData);
      
      // Redirect based on role
      if (userData.userRole === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
      
      return storedData;
    } catch (error) {
      log('Login failed', error, 'error');
      throw error;
    }
  },

  // Logout with proper cleanup
  logout() {
    const userData = getUserData();
    const userRole = userData?.userRole || 'unknown';
    
    if (confirm(`Are you sure you want to logout?`)) {
      log(`${userRole} user logging out`);
      
      // Clear appropriate storage
      if (userData) {
        const storageKey = getStorageKey(userData.userRole);
        localStorage.removeItem(storageKey);
      }
      
      // Clear tokens
      localStorage.removeItem('admin_token');
      
      // Clear any other session data
      if (AppState?.autoRefreshTimer) {
        clearInterval(AppState.autoRefreshTimer);
      }
      
      showToast('Logging out', `${userRole} session ended. Goodbye!`, 'info', 1000);
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    }
  }
};

// Legacy API call function for backward compatibility
async function makeAPICall(endpoint, method = 'GET', data = null) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  // Add authentication headers
  const userData = getUserData();
  if (userData) {
    config.headers['x-user-role'] = userData.userRole;
  }
  
  // Add admin token if available (for backward compatibility)
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  try {
    log(`Making API call to: ${CONFIG.API_BASE_URL}${endpoint}`, { method, data });
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    log(`API call successful`, responseData);
    return responseData;
  } catch (error) {
    log('API call failed', error, 'error');
    throw error;
  }
}

// Legacy wrapper functions for backward compatibility
function validateAuthentication() {
  return AdminAuth.validateAuthentication();
}

async function makeAuthenticatedRequest(url, options = {}) {
  return AdminAuth.makeAuthenticatedRequest(url, options);
}

function handleLogout() {
  AdminAuth.logout();
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminAuth = AdminAuth;
  window.validateAuthentication = validateAuthentication;
  window.makeAuthenticatedRequest = makeAuthenticatedRequest;
  window.makeAPICall = makeAPICall;
  window.handleLogout = handleLogout;
  window.loginUser = AdminAuth.loginUser;
}