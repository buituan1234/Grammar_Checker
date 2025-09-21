/**
 * admin-ui.js
 * UI update and management functions
 */

'use strict';

// UI management functions
const AdminUI = {
  // Update statistics display
  updateStatistics() {
    const stats = {
      total: AppState.allUsers.length,
      active: AppState.allUsers.filter(u => u.status === 'active').length,
      inactive: AppState.allUsers.filter(u => u.status === 'inactive').length,
      plus: AppState.allUsers.filter(u => u.accountType === 'plus').length,
      free: AppState.allUsers.filter(u => u.accountType === 'free').length,
      admin: AppState.allUsers.filter(u => u.role === 'admin').length
    };
    
    if (elements.totalUsers) elements.totalUsers.textContent = stats.total;
    if (elements.activeUsers) elements.activeUsers.textContent = stats.active;
    if (elements.plusUsers) elements.plusUsers.textContent = stats.plus;
    
    log('Statistics updated', stats);
  },

  // Render user table
  renderUserTable() {
    if (!elements.userTableBody) {
      console.error('User table body element not found');
      return;
    }
    
    if (AppState.filteredUsers.length === 0) {
      elements.userTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="empty">
            ${AppState.allUsers.length === 0 ? 'No users found in database.' : 'No users match your search criteria.'}
          </td>
        </tr>
      `;
      return;
    }
    
    elements.userTableBody.innerHTML = AppState.filteredUsers.map(user => `
      <tr data-user-id="${user.id}">
        <td>${user.id}</td>
        <td><strong>${user.username}</strong></td>
        <td>${user.fullName}</td>
        <td>${user.email}</td>
        <td>${user.phone || '-'}</td>
        <td>
          <span class="role-badge role-${user.role}">${user.role}</span>
        </td>
        <td>
          <span class="account-type-badge ${user.accountType}">${user.accountType}</span>
        </td>
        <td>
          <span class="status-badge status-${user.status}">${user.status}</span>
        </td>
        <td>${formatDate(user.createdAt)}</td>
        <td>${user.updatedAt ? formatDate(user.updatedAt) : '-'}</td>  
        <td>
          <div class="actions">
            <button class="btn btn-small btn-primary action-edit" data-user-id="${user.id}" title="Edit User">
              ✏️ Edit
            </button>
            <button class="btn btn-small btn-danger action-delete" data-user-id="${user.id}" title="Delete User">
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    
    setupTableEventListeners();
    log('User table rendered', { displayedCount: AppState.filteredUsers.length });
  },

  // Update connection status indicator
  updateConnectionStatus(status = 'loading') {
    const statusMap = {
      online: { class: 'status-online', text: 'Connected to Database' },
      offline: { class: 'status-offline', text: 'Database Offline' },
      loading: { class: 'status-loading', text: 'Connecting...' }
    };
    
    const config = statusMap[status] || statusMap.loading;
    
    if (elements.connectionStatus) {
      elements.connectionStatus.className = `status-indicator ${config.class}`;
    }
    if (elements.connectionText) {
      elements.connectionText.textContent = config.text;
    }
    
    log(`Connection status updated: ${status} - ${config.text}`);
  },

  // Show/hide loading overlay
  showLoading(show) {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    AppState.isLoading = show;
  },

  // Show/hide button loading state
  showButtonLoading(button, textElement, loaderElement, show) {
    if (!button) return;
    
    if (show) {
      button.disabled = true;
      if (textElement) textElement.style.display = 'none';
      if (loaderElement) loaderElement.style.display = 'inline-block';
    } else {
      button.disabled = false;
      if (textElement) textElement.style.display = 'inline';
      if (loaderElement) loaderElement.style.display = 'none';
    }
  },

  // Show toast notification
  showToast(title, message, type = 'info', duration = 3000) {
    if (!elements.toastContainer) {
      log('Toast container not found', null, 'warn');
      return;
    }
    
    const toastId = 'toast-' + Date.now();
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">
          <div class="toast-title">${title}</div>
          <div class="toast-text">${message}</div>
        </div>
        <button class="toast-close" data-toast-id="${toastId}">×</button>
      </div>
      <div class="toast-progress"></div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => this.removeToast(toastId), duration);
    log(`Toast shown: ${type} - ${title}: ${message}`);
  },

  // Remove toast notification
  removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  },

  // Show error in table
  showError(message) {
    if (elements.userTableBody) {
      elements.userTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="error">
            <span class="status-indicator status-offline"></span>
            <strong>Error:</strong> ${message}
            <br><button class="btn btn-small retry-btn" style="margin-top: 1rem;">🔄 Retry</button>
          </td>
        </tr>
      `;
      
      const retryBtn = elements.userTableBody.querySelector('.retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', loadUsers);
      }
    }
    
    this.updateConnectionStatus('offline');
  },

  // Refresh users
  refreshUsers() {
    this.showToast('Refreshing', 'Loading latest user data from database...', 'info', 1000);
    loadUsers();
  },

  // Toggle debug panel
  toggleDebug() {
    AppState.isDebugMode = !AppState.isDebugMode;
    
    if (!elements.debugInfo || !elements.debugBtn) return;
    
    const isVisible = elements.debugInfo.style.display !== 'none';
    
    if (isVisible) {
      elements.debugInfo.style.display = 'none';
      elements.debugBtn.textContent = '🔍 Debug';
    } else {
      elements.debugInfo.style.display = 'block';
      elements.debugBtn.textContent = '🔍 Hide Debug';
      this.updateDebugInfo();
    }
    
    log(`Debug mode ${AppState.isDebugMode ? 'enabled' : 'disabled'}`);
  },

  // Update debug information
  updateDebugInfo() {
    if (!elements.debugContent) return;
    
    const debugData = {
      'Total Users': AppState.allUsers.length,
      'Filtered Users': AppState.filteredUsers.length,
      'Edit Mode': AppState.isEditMode,
      'Current User': AppState.currentEditingUserId ? 
        AdminState.getUserById(AppState.currentEditingUserId)?.username || 'Unknown' : 'None',
      'Search Term': elements.searchInput?.value || 'Empty',
      'API Base URL': CONFIG.API_BASE_URL,
      'Storage Key': CONFIG.ADMIN_STORAGE_KEY,
      'Last Updated': new Date().toLocaleString(),
      'Sample User Data': AppState.allUsers.length > 0 ? JSON.stringify(AppState.allUsers[0], null, 2) : 'No users loaded'
    };
    
    elements.debugContent.innerHTML = Object.entries(debugData)
      .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
      .join('');
  }
};

// Legacy wrapper functions for backward compatibility
function updateStatistics() {
  AdminUI.updateStatistics();
}

function renderUserTable() {
  AdminUI.renderUserTable();
}

function updateConnectionStatus(status) {
  AdminUI.updateConnectionStatus(status);
}

function showLoading(show) {
  AdminUI.showLoading(show);
}

function showButtonLoading(button, textElement, loaderElement, show) {
  AdminUI.showButtonLoading(button, textElement, loaderElement, show);
}

function showToast(title, message, type, duration) {
  AdminUI.showToast(title, message, type, duration);
}

function removeToast(toastId) {
  AdminUI.removeToast(toastId);
}

function showError(message) {
  AdminUI.showError(message);
}

function refreshUsers() {
  AdminUI.refreshUsers();
}

function toggleDebug() {
  AdminUI.toggleDebug();
}

function updateDebugInfo() {
  AdminUI.updateDebugInfo();
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminUI = AdminUI;
  window.updateStatistics = updateStatistics;
  window.renderUserTable = renderUserTable;
  window.updateConnectionStatus = updateConnectionStatus;
  window.showLoading = showLoading;
  window.showButtonLoading = showButtonLoading;
  window.showToast = showToast;
  window.removeToast = removeToast;
  window.showError = showError;
  window.refreshUsers = refreshUsers;
  window.toggleDebug = toggleDebug;
  window.updateDebugInfo = updateDebugInfo;
}