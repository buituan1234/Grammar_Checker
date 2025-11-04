/**
 * admin-api.js
 * API functions for user management
 */

'use strict';

// API management functions
const AdminAPI = {
  // Helper: Get admin headers
  getAdminHeaders() {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser || currentUser.userRole !== 'admin') {
      throw new Error('Admin access required');
    }
    
    return {
      'Content-Type': 'application/json',
      'x-user-role': currentUser.userRole,
      'x-user-id': currentUser.userId?.toString() || '',
      'x-admin-id': currentUser.userId?.toString() || ''
    };
  },

  async loadUsers() {
    showLoading(true);

    try {
      log('Starting to load users...');
      
      // Get admin headers
      const headers = this.getAdminHeaders();
      
      // Call API with proper headers
      const response = await fetch(`${CONFIG.API_BASE_URL}/users/admin/all`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const usersData = data.users || data.data || data;

      // Validate data
      if (!usersData || usersData.length === 0) {
        showError('No users found in database.');
        updateConnectionStatus('offline');
        return;
      }

      // Normalize data
      const normalizedUsers = this.normalizeUsersData(usersData);

      // Update state
      AdminState.setUsers(normalizedUsers);
      updateStatistics();
      renderUserTable();
      updateConnectionStatus('online');
      
      showToast('Success', `Loaded ${normalizedUsers.length} users`, 'success', 2000);
      log('Users loaded successfully', { count: normalizedUsers.length });
      
    } catch (err) {
      log('Error loading users', err, 'error');
      showError('Failed to load users: ' + err.message);
      updateConnectionStatus('offline');
    } finally {
      showLoading(false);
    }
  },

  // Normalize user data from different API formats
  normalizeUsersData(usersData) {
    return usersData.map((user, idx) => ({
        id: Number(user.UserID ?? user.id ?? (idx + 1)),
        username: user.Username || user.username || `user${idx + 1}`,
        fullName: user.FullName || user.fullName || user.name || 'Unknown User',
        email: user.Email || user.email || `user${idx + 1}@example.com`,
        phone: user.Phone || user.phone || '',
        role: (user.UserRole || user.role || 'user').toLowerCase(),
        accountType: user.AccountType || user.accountType || (user.isPremium ? 'plus' : 'free'),
        status: user.UserStatus || user.status || (user.isActive ? 'active' : 'inactive'),
        createdAt: user.CreatedAt || user.createdAt || new Date().toISOString(),
        updatedAt: user.UpdatedAt || user.updatedAt || null,
        
        _debugUpdatedAt: user.UpdatedAt,
        _debugupdatedAt: user.updatedAt
    }));
  },

  // Create new user
  async createUser(userData) {
    try {
      log('Creating new user', userData);
      
      const headers = this.getAdminHeaders();
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/users`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Format the new user data
      const newUser = result.user || result.data || result;
      const formattedUser = {
        id: newUser.UserID || newUser.id || Date.now(),
        username: newUser.Username || newUser.username || userData.username,
        fullName: newUser.FullName || newUser.fullName || userData.fullName,
        email: newUser.Email || newUser.email || userData.email,
        phone: newUser.Phone || newUser.phone || userData.phone || '',
        role: newUser.UserRole || newUser.role || userData.role || 'user',
        accountType: newUser.AccountType || newUser.accountType || userData.accountType || 'free',
        status: newUser.UserStatus || newUser.status || userData.status || 'active',
        createdAt: newUser.CreatedAt || newUser.createdAt || new Date().toISOString()
      };
      
      // Add to state
      AdminState.addUser(formattedUser);
      updateStatistics();
      renderUserTable();
      
      showToast('Success', `User "${userData.username}" created successfully`, 'success');
      log('User created successfully', formattedUser);
      
      return formattedUser;
    } catch (error) {
      log('Error creating user', error, 'error');
      throw new Error('Failed to create user: ' + error.message);
    }
  },

  // Update existing user
  async updateUser(userId, userData) {
    try {
      log('Starting user update', { userId, userData });
      
      const headers = this.getAdminHeaders();
      
      const currentUserData = AdminState.getUserById(userId);
      if (!currentUserData) {
        throw new Error('User not found in local data');
      }
      
      // Create detailed update payload
      const updatePayload = {
        username: userData.username || currentUserData.username,
        email: userData.email || currentUserData.email,
        phone: userData.phone !== undefined ? userData.phone : (currentUserData.phone || ''),
        fullName: userData.fullName || currentUserData.fullName
      };
      
      if (userData.hasOwnProperty('status')) {
        updatePayload.status = userData.status;
      } else {
        updatePayload.status = currentUserData.status;
      }
      
      if (userData.hasOwnProperty('accountType')) {
        updatePayload.accountType = userData.accountType;
      } else {
        updatePayload.accountType = currentUserData.accountType;
      }
      
      if (userData.hasOwnProperty('role')) {
        updatePayload.role = userData.role;
      } else {
        updatePayload.role = currentUserData.role;
      }
      
      // Add password only if provided
      if (userData.password && userData.password.trim()) {
        updatePayload.password = userData.password.trim();
      }
      
      log('Final update payload', updatePayload);
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/users/admin/update/${userId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      log('API response received', result);
      
      if (result && result.user) {
        const apiUser = result.user;
        log('API returned user data', apiUser);
        
        const updatedUser = {
          id: Number(userId),
          username: apiUser.Username || apiUser.username,
          fullName: apiUser.FullName || apiUser.fullName,
          email: apiUser.Email || apiUser.email,
          phone: apiUser.Phone || apiUser.phone || '',
          role: (apiUser.UserRole || apiUser.role || 'user').toLowerCase(),
          accountType: apiUser.AccountType || apiUser.accountType || 'free',
          status: apiUser.UserStatus || apiUser.status || 'active',
          createdAt: apiUser.CreatedAt || apiUser.createdAt,
          updatedAt: apiUser.UpdatedAt || apiUser.updatedAt
        };
        
        log('Using UpdatedAt from API response', updatedUser.updatedAt);
        
        // Update state and UI immediately
        AdminState.updateUser(userId, updatedUser);
        updateStatistics();
        renderUserTable();
        
        const changes = [];
        if (currentUserData.status !== updatedUser.status) {
          changes.push(`Status: ${currentUserData.status} → ${updatedUser.status}`);
        }
        if (currentUserData.accountType !== updatedUser.accountType) {
          changes.push(`Account Type: ${currentUserData.accountType} → ${updatedUser.accountType}`);
        }
        if (currentUserData.role !== updatedUser.role) {
          changes.push(`Role: ${currentUserData.role} → ${updatedUser.role}`);
        }
        
        let message = `User "${updatedUser.username}" updated successfully`;
        if (changes.length > 0) {
          message += `\nChanges: ${changes.join(', ')}`;
        }
        
        showToast('Success', message, 'success', 4000);
        log('User update completed successfully', { updatedUser, changes });
        
        return updatedUser;
        
      } else {
        const updatedUser = {
          id: Number(userId),
          username: updatePayload.username,
          fullName: updatePayload.fullName,
          email: updatePayload.email,
          phone: updatePayload.phone,
          role: updatePayload.role,
          accountType: updatePayload.accountType,
          status: updatePayload.status,
          createdAt: currentUserData.createdAt,
          updatedAt: new Date().toISOString() 
        };
        
        // Update state and UI immediately
        AdminState.updateUser(userId, updatedUser);
        updateStatistics();
        renderUserTable();
        
        const changes = [];
        if (currentUserData.status !== updatedUser.status) {
          changes.push(`Status: ${currentUserData.status} → ${updatedUser.status}`);
        }
        if (currentUserData.accountType !== updatedUser.accountType) {
          changes.push(`Account Type: ${currentUserData.accountType} → ${updatedUser.accountType}`);
        }
        if (currentUserData.role !== updatedUser.role) {
          changes.push(`Role: ${currentUserData.role} → ${updatedUser.role}`);
        }
        
        let message = `User "${updatedUser.username}" updated successfully`;
        if (changes.length > 0) {
          message += `\nChanges: ${changes.join(', ')}`;
        }
        
        showToast('Success', message, 'success', 4000);
        log('User update completed successfully (fallback mode)', { updatedUser, changes });
        
        return updatedUser;
      }
      
    } catch (error) {
      log('Error updating user', error, 'error');
      throw new Error('Failed to update user: ' + error.message);
    }
  },

  // Delete user
  async deleteUser(userId) {
    const user = AdminState.getUserById(userId);
    if (!user) {
      showToast('Error', 'User not found', 'error');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete user "${user.username}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    showLoading(true);
    
    try {
      log('Deleting user', { userId, user });
      
      const headers = this.getAdminHeaders();
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/users/admin/delete/${userId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      // Remove user from state and update UI
      AdminState.removeUser(userId);
      updateStatistics();
      renderUserTable();
      
      showToast('Success', `User "${user.username}" deleted successfully`, 'success');
      log('User deleted successfully', { userId, username: user.username });
      
    } catch (error) {
      log('Delete error', error, 'error');
      showToast('Error', 'Failed to delete user: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }
};

// Legacy wrapper functions for backward compatibility
async function loadUsers() {
  return AdminAPI.loadUsers();
}

async function createUser(userData) {
  return AdminAPI.createUser(userData);
}

async function updateUser(userId, userData) {
  return AdminAPI.updateUser(userId, userData);
}

async function deleteUser(userId) {
  return AdminAPI.deleteUser(userId);
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminAPI = AdminAPI;
  window.loadUsers = loadUsers;
  window.createUser = createUser;
  window.updateUser = updateUser;
  window.deleteUser = deleteUser;
}