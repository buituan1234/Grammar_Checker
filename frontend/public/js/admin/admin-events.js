/**
 * admin-events.js
 * Event handlers and listeners
 */

'use strict';

// Event management functions
const AdminEvents = {
  // Initialize all event listeners
  initializeEventListeners() {
    // Header events
    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Search and refresh
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', this.handleSearch);
    }
    if (elements.refreshBtn) {
      elements.refreshBtn.addEventListener('click', refreshUsers);
    }
    if (elements.debugBtn) {
      elements.debugBtn.addEventListener('click', toggleDebug);
    }
    
    // Modal events
    if (elements.addUserBtn) {
      elements.addUserBtn.addEventListener('click', showAddUserModal);
    }
    if (elements.cancelBtn) {
      elements.cancelBtn.addEventListener('click', hideUserModal);
    }
    if (elements.userForm) {
      elements.userForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Quick toggle modal events
    if (elements.quickToggleCancelBtn) {
      elements.quickToggleCancelBtn.addEventListener('click', hideQuickToggleModal);
    }
    if (elements.quickToggleConfirmBtn) {
      elements.quickToggleConfirmBtn.addEventListener('click', handleQuickToggleConfirm);
    }
    
    // Modal background click to close
    this.setupModalCloseEvents();
    
    // Toast events
    this.setupToastEvents();
    
    // Form field validation events
    this.setupFormValidationEvents();
    
    // Account settings checkbox events
    this.setupCheckboxEvents();
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Storage monitoring
    monitorStorageChanges();
    
    log('Event listeners initialized successfully');
  },

  // Setup table event listeners
  setupTableEventListeners() {
    if (!elements.userTableBody) return;
    
    elements.userTableBody.removeEventListener('click', this.handleTableClick);
    elements.userTableBody.addEventListener('click', this.handleTableClick);
  },

  // Handle table clicks
  handleTableClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const userId = Number(btn.dataset?.userId || btn.closest('tr')?.dataset?.userId);
    if (!userId || Number.isNaN(userId)) return;

    e.preventDefault();
    e.stopPropagation();

    if (btn.classList.contains('action-edit')) {
      showEditUserModal(userId);
    } else if (btn.classList.contains('action-delete')) {
      deleteUser(userId);
    }
  },

  // Handle search input
  handleSearch() {
    if (!elements.searchInput) return;
    
    // Clear previous timeout
    if (AppState.searchTimeout) {
      clearTimeout(AppState.searchTimeout);
    }
    
    // Debounce search
    AppState.searchTimeout = setTimeout(() => {
      const searchTerm = elements.searchInput.value.toLowerCase().trim();
      
      AdminState.filterUsers(searchTerm);
      renderUserTable();
      
      if (searchTerm && AppState.filteredUsers.length !== AppState.allUsers.length) {
        showToast('Search Results', `Found ${AppState.filteredUsers.length} of ${AppState.allUsers.length} users`, 'info', 2000);
      }
      
      log(`Search performed: "${searchTerm}", showing ${AppState.filteredUsers.length}/${AppState.allUsers.length} users`);
    }, CONFIG.SEARCH_DEBOUNCE_DELAY);
  },

  // Setup modal close events
  setupModalCloseEvents() {
    if (elements.userModal) {
      elements.userModal.addEventListener('click', function(e) {
        if (e.target === elements.userModal) {
          hideUserModal();
        }
      });
    }
    
    if (elements.quickToggleModal) {
      elements.quickToggleModal.addEventListener('click', function(e) {
        if (e.target === elements.quickToggleModal) {
          hideQuickToggleModal();
        }
      });
    }
  },

  // Setup toast events
  setupToastEvents() {
    if (elements.toastContainer) {
      elements.toastContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('toast-close')) {
          const toastId = e.target.closest('.toast').id;
          removeToast(toastId);
        }
      });
    }
  },

  // Setup form validation events
  setupFormValidationEvents() {
    if (elements.username) {
      elements.username.addEventListener('blur', validateUsername);
    }
    if (elements.email) {
      elements.email.addEventListener('blur', validateEmail);
    }
    if (elements.fullName) {
      elements.fullName.addEventListener('blur', validateFullName);
    }
    if (elements.password) {
      elements.password.addEventListener('input', validatePassword);
    }
  },

  // Setup checkbox events
  setupCheckboxEvents() {
    if (elements.isActive) {
      elements.isActive.addEventListener('change', function() {
        this.parentElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
          if (this.parentElement) {
            this.parentElement.style.transform = '';
          }
        }, 200);
      });
    }
    
    if (elements.isPlusAccount) {
      elements.isPlusAccount.addEventListener('change', function() {
        this.parentElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
          if (this.parentElement) {
            this.parentElement.style.transform = '';
          }
        }, 200);
        
        if (elements.isPlusAccount.checked) {
          showToast('Plus Account', 'User will get premium features access', 'warning', 3000);
        }
      });
    }
    
    if (elements.isAdmin) {
      elements.isAdmin.addEventListener('change', function() {
        this.parentElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
          if (this.parentElement) {
            this.parentElement.style.transform = '';
          }
        }, 200);
        
        if (elements.isAdmin.checked) {
          showToast('Admin Role', 'User will get full admin panel access', 'warning', 3000);
        }
      });
    }
  },

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (elements.searchInput) {
          elements.searchInput.focus();
          elements.searchInput.select();
        }
      }
      
      // Ctrl/Cmd + N: Add new user
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddUserModal();
      }
      
      // Escape: Close modals
      if (e.key === 'Escape') {
        if (elements.userModal?.classList.contains('show')) {
          hideUserModal();
        }
        if (elements.quickToggleModal?.classList.contains('show')) {
          hideQuickToggleModal();
        }
      }
      
      // Ctrl/Cmd + R: Refresh users
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshUsers();
      }
    });
    
    log('Keyboard shortcuts setup completed');
  }
};

// Legacy wrapper functions for backward compatibility
function initializeEventListeners() {
  AdminEvents.initializeEventListeners();
}

function setupTableEventListeners() {
  AdminEvents.setupTableEventListeners();
}

function handleTableClick(e) {
  AdminEvents.handleTableClick(e);
}

function handleSearch() {
  AdminEvents.handleSearch();
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminEvents = AdminEvents;
  window.initializeEventListeners = initializeEventListeners;
  window.setupTableEventListeners = setupTableEventListeners;
  window.handleTableClick = handleTableClick;
  window.handleSearch = handleSearch;
}