/**
 * admin-utils.js
 * Utility functions for admin panel
 */

'use strict';

// Logging function
function log(message, data = null, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] 🔍 Admin Panel: ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, data || '');
      break;
    case 'warn':
      console.warn(logMessage, data || '');
      break;
    default:
      console.log(logMessage, data || '');
  }
  
  // Add to debug panel if enabled
  if (AppState.isDebugMode) {
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
      const debugEntry = document.createElement('div');
      debugEntry.innerHTML = `
        <div style="margin-bottom: 0.5rem; padding: 0.5rem; border-left: 3px solid ${level === 'error' ? '#dc3545' : level === 'warn' ? '#ffc107' : '#28a745'};">
          <strong>[${new Date().toLocaleTimeString()}]</strong> ${message}
          ${data ? `<pre style="margin-top: 0.25rem; font-size: 0.75rem;">${JSON.stringify(data, null, 2)}</pre>` : ''}
        </div>
      `;
      debugContent.appendChild(debugEntry);
      debugContent.scrollTop = debugContent.scrollHeight;
    }
  }
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    // Parse trực tiếp từ string không để JS convert timezone
    const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      const [, year, month, day, hour, minute] = parts;
      return `${new Date(year, month-1, day).toLocaleDateString('en-US', {month: 'short'})} ${day}, ${year}, ${hour.padStart(2,'0')}:${minute}`;
    }
    return dateString; // fallback
  } catch (e) {
    return 'Invalid Date';
  }
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if current page is admin panel
function isAdminPanel() {
  return window.location.pathname.includes('admin') || 
         window.location.href.includes('admin') ||
         document.title.toLowerCase().includes('admin') ||
         document.getElementById('adminUsername') !== null;
}

// Initialize DOM elements
function initializeElements() {
  elements = {
    // Header elements
    adminUsername: document.getElementById('adminUsername'),
    connectionStatus: document.getElementById('connectionStatus'),
    connectionText: document.getElementById('connectionText'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Statistics elements
    totalUsers: document.getElementById('totalUsers'),
    activeUsers: document.getElementById('activeUsers'),
    plusUsers: document.getElementById('plusUsers'),
    
    // Table elements
    searchInput: document.getElementById('searchInput'),
    userTableBody: document.getElementById('userTableBody'),
    refreshBtn: document.getElementById('refreshBtn'),
    debugBtn: document.getElementById('debugBtn'),
    debugInfo: document.getElementById('debugInfo'),
    debugContent: document.getElementById('debugContent'),
    
    // Modal elements
    userModal: document.getElementById('userModal'),
    modalTitle: document.getElementById('modalTitle'),
    userForm: document.getElementById('userForm'),
    addUserBtn: document.getElementById('addUserBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    saveBtn: document.getElementById('saveBtn'),
    saveBtnText: document.getElementById('saveBtnText'),
    saveBtnLoader: document.getElementById('saveBtnLoader'),
    
    // Form fields
    editUserId: document.getElementById('editUserId'),
    username: document.getElementById('username'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    fullName: document.getElementById('fullName'),
    password: document.getElementById('password'),
    passwordRequired: document.getElementById('passwordRequired'),
    passwordHint: document.getElementById('passwordHint'),
    
    // Account settings
    accountSettings: document.getElementById('accountSettings'),
    isActive: document.getElementById('isActive'),
    isPlusAccount: document.getElementById('isPlusAccount'),
    isAdmin: document.getElementById('isAdmin'),
    roleSelection: document.getElementById('roleSelection'),
    
    // Quick toggle modal
    quickToggleModal: document.getElementById('quickToggleModal'),
    quickToggleUsername: document.getElementById('quickToggleUsername'),
    quickToggleOptions: document.getElementById('quickToggleOptions'),
    quickToggleCancelBtn: document.getElementById('quickToggleCancelBtn'),
    quickToggleConfirmBtn: document.getElementById('quickToggleConfirmBtn'),
    quickToggleBtnText: document.getElementById('quickToggleBtnText'),
    quickToggleBtnLoader: document.getElementById('quickToggleBtnLoader'),
    
    // Other elements
    loadingOverlay: document.getElementById('loadingOverlay'),
    toastContainer: document.getElementById('toastContainer')
  };
  
  log('DOM elements initialized');
}

// Fix input styling issues
function fixInputStyling() {
  const inputs = document.querySelectorAll('input, select');
  
  inputs.forEach(input => {
    // Remove all HTML5 validation attributes
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    
    // Remove any invalid/valid classes
    input.classList.remove('invalid', 'valid', 'error');
    
    // Force reset styling
    input.style.borderColor = '#667eea';
    input.style.boxShadow = 'none';
    input.style.outline = 'none';
    input.style.transform = 'none';
    input.style.backfaceVisibility = 'hidden';
    
    // Override events
    const events = ['focus', 'blur', 'invalid', 'input'];
    events.forEach(eventType => {
      input.addEventListener(eventType, function(e) {
        if (eventType === 'invalid') {
          e.preventDefault();
          e.stopPropagation();
        }
        
        this.style.borderColor = eventType === 'focus' ? '#4f46e5' : '#667eea';
        this.style.boxShadow = eventType === 'focus' ? '0 0 0 3px rgba(102, 126, 234, 0.15)' : 'none';
        this.style.outline = 'none';
        this.style.transform = 'none';
      });
    });
  });
}

// Setup input fixes
function setupInputFixes() {
  // Observer for modal changes
  const userModal = document.getElementById('userModal');
  if (userModal) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (userModal.classList.contains('show')) {
            setTimeout(fixInputStyling, 50);
            setTimeout(fixInputStyling, 200);
            setTimeout(fixInputStyling, 500);
          }
        }
      });
    });
    
    observer.observe(userModal, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
}

// Setup password toggle
function setupPasswordToggle() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#togglePassword') || e.target.closest('.toggle-password')) {
      const toggleBtn = e.target.closest('#togglePassword') || e.target.closest('.toggle-password');
      const passwordInput = document.getElementById('password');
      
      if (passwordInput) {
        const isHidden = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isHidden ? 'text' : 'password');
        
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye', !isHidden);
          icon.classList.toggle('fa-eye-slash', isHidden);
        }
      }
    }
  });
}

// Export functions
function exportUsers(format = 'csv') {
  const exportData = AppState.filteredUsers.map(user => ({
    ID: user.id,
    Username: user.username,
    'Full Name': user.fullName,
    Email: user.email,
    Phone: user.phone || '',
    Role: user.role,
    'Account Type': user.accountType,
    Status: user.status,
    'Created At': formatDate(user.createdAt)
  }));
  
  if (format === 'csv') {
    exportToCSV(exportData, 'users.csv');
  } else if (format === 'json') {
    exportToJSON(exportData, 'users.json');
  }
  
  showToast('Export', `Exported ${exportData.length} users as ${format.toUpperCase()}`, 'success');
}

function exportToCSV(data, filename) {
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => 
        JSON.stringify(row[header] || '')
      ).join(',')
    )
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv');
}

function exportToJSON(data, filename) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Global exports
if (typeof window !== 'undefined') {
  window.log = log;
  window.formatDate = formatDate;
  window.delay = delay;
  window.isAdminPanel = isAdminPanel;
  window.initializeElements = initializeElements;
  window.fixInputStyling = fixInputStyling;
  window.setupInputFixes = setupInputFixes;
  window.setupPasswordToggle = setupPasswordToggle;
  window.exportUsers = exportUsers;
}