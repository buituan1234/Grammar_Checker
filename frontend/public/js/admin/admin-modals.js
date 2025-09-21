/**
 * admin-modals.js
 * Modal management functions
 */

'use strict';

// Modal management functions
const AdminModals = {
  // Show add user modal
  showAddUserModal() {
    this.resetModalState();
    
    if (elements.modalTitle) elements.modalTitle.textContent = 'Add New User';
    if (elements.saveBtnText) elements.saveBtnText.textContent = 'Create User';
    if (elements.passwordRequired) elements.passwordRequired.style.display = 'inline';
    if (elements.passwordHint) elements.passwordHint.style.display = 'none';
    if (elements.accountSettings) elements.accountSettings.style.display = 'none';
    
    this.showModal();
    log('Add user modal opened');
  },

  // Show edit user modal
  showEditUserModal(userId) {
    const user = AdminState.getUserById(userId);
    if (!user) {
      showToast('Error', 'User not found', 'error');
      return;
    }
    
    this.resetModalState();
    AdminState.setEditMode(userId);
    
    // Update modal UI
    if (elements.modalTitle) elements.modalTitle.textContent = 'Edit User';
    if (elements.saveBtnText) elements.saveBtnText.textContent = 'Update User';
    if (elements.passwordRequired) elements.passwordRequired.style.display = 'none';
    if (elements.passwordHint) elements.passwordHint.style.display = 'block';
    if (elements.accountSettings) elements.accountSettings.style.display = 'block';
    if (elements.roleSelection) elements.roleSelection.style.display = 'block';
    
    // Populate form fields
    populateFormFields(user);
    
    this.showModal();
    log('Edit user modal opened', { userId, user });
  },

  // Show modal
  showModal() {
    if (elements.userForm) elements.userForm.reset();
    
    // Populate form if in edit mode
    if (AppState.isEditMode && AppState.currentEditingUserId) {
      const user = AdminState.getUserById(AppState.currentEditingUserId);
      if (user) populateFormFields(user);
    }
    
    clearValidationErrors();
    
    if (elements.userModal) elements.userModal.classList.add('show');
    
    // Apply styling fixes
    setTimeout(() => {
      fixInputStyling();
      if (elements.username) elements.username.focus();
    }, 100);
  },

  // Hide user modal
  hideUserModal() {
    if (elements.userModal) elements.userModal.classList.remove('show');
    this.resetModalState();
    setTimeout(fixInputStyling, 100);
  },

  // Reset modal state
  resetModalState() {
    AdminState.clearEditMode();
    
    if (elements.userForm) {
      elements.userForm.reset();
      const inputs = elements.userForm.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.style.borderColor = '#e9ecef';
        input.style.boxShadow = 'none';
        input.classList.remove('error', 'success');
      });
    }
    clearValidationErrors();
  },

  // Show quick toggle modal
  showQuickToggle(userId) {
    const user = AdminState.getUserById(userId);
    if (!user) {
      showToast('Error', 'User not found', 'error');
      return;
    }
    
    if (!elements.quickToggleModal) {
      console.error('Quick toggle modal not found');
      return;
    }
    
    AdminState.setEditMode(userId);
    if (elements.quickToggleUsername) {
      elements.quickToggleUsername.textContent = user.username;
    }
    
    const options = [
      {
        id: 'status',
        label: 'Account Status',
        current: user.status,
        new: user.status === 'active' ? 'inactive' : 'active'
      },
      {
        id: 'accountType',
        label: 'Account Type',
        current: user.accountType,
        new: user.accountType === 'free' ? 'plus' : 'free'
      }
    ];
    
    if (user.role !== 'admin') {
      options.push({
        id: 'role',
        label: 'User Role',
        current: user.role,
        new: user.role === 'user' ? 'admin' : 'user'
      });
    }
    
    if (elements.quickToggleOptions) {
      elements.quickToggleOptions.innerHTML = options.map(option => `
        <div class="quick-toggle-option" data-field="${option.id}">
          <div class="quick-toggle-label">${option.label}</div>
          <div class="quick-toggle-badges">
            <span class="quick-toggle-badge current">${option.current}</span>
            <span style="margin: 0 0.5rem;">→</span>
            <span class="quick-toggle-badge new">${option.new}</span>
          </div>
        </div>
      `).join('');
      
      elements.quickToggleOptions.querySelectorAll('.quick-toggle-option').forEach(option => {
        option.addEventListener('click', function() {
          this.classList.toggle('active');
        });
      });
    }
    
    elements.quickToggleModal.classList.add('show');
    log('Quick toggle modal opened', { userId, user });
  },

  // Hide quick toggle modal
  hideQuickToggleModal() {
    if (elements.quickToggleModal) {
      elements.quickToggleModal.classList.remove('show');
    }
    AdminState.clearEditMode();
  },

  // Handle quick toggle confirmation
  async handleQuickToggleConfirm() {
    if (!elements.quickToggleOptions) return;
    
    const selectedOptions = elements.quickToggleOptions.querySelectorAll('.quick-toggle-option.active');
    
    if (selectedOptions.length === 0) {
      showToast('No Changes', 'Please select at least one option to change', 'warning');
      return;
    }
    
    showButtonLoading(elements.quickToggleConfirmBtn, elements.quickToggleBtnText, elements.quickToggleBtnLoader, true);
    
    try {
      const currentUser = AdminState.getUserById(AppState.currentEditingUserId);
      const changes = {};
      
      selectedOptions.forEach(option => {
        const field = option.dataset.field;
        const newBadge = option.querySelector('.quick-toggle-badge.new');
        const newValue = newBadge.textContent;
        changes[field] = newValue;
      });
      
      await updateUser(AppState.currentEditingUserId, {
        ...currentUser,
        ...changes
      });
      
      this.hideQuickToggleModal();
      
    } catch (error) {
      log('Quick toggle error', error, 'error');
      showToast('Error', error.message || 'Update failed', 'error');
    } finally {
      showButtonLoading(elements.quickToggleConfirmBtn, elements.quickToggleBtnText, elements.quickToggleBtnLoader, false);
    }
  }
};

// Legacy wrapper functions for backward compatibility
function showAddUserModal() {
  AdminModals.showAddUserModal();
}

function showEditUserModal(userId) {
  AdminModals.showEditUserModal(userId);
}

function showModal() {
  AdminModals.showModal();
}

function hideUserModal() {
  AdminModals.hideUserModal();
}

function resetModalState() {
  AdminModals.resetModalState();
}

function showQuickToggle(userId) {
  AdminModals.showQuickToggle(userId);
}

function hideQuickToggleModal() {
  AdminModals.hideQuickToggleModal();
}

async function handleQuickToggleConfirm() {
  return AdminModals.handleQuickToggleConfirm();
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminModals = AdminModals;
  window.showAddUserModal = showAddUserModal;
  window.showEditUserModal = showEditUserModal;
  window.showModal = showModal;
  window.hideUserModal = hideUserModal;
  window.resetModalState = resetModalState;
  window.showQuickToggle = showQuickToggle;
  window.hideQuickToggleModal = hideQuickToggleModal;
  window.handleQuickToggleConfirm = handleQuickToggleConfirm;
}