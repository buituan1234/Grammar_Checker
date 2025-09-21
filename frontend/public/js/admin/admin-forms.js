/**
 * admin-forms.js
 * Form handling and validation functions
 */

'use strict';

// Form management functions
const AdminForms = {
  // Get form data from modal
  getFormData() {
    const data = {
      username: elements.username?.value?.trim() || '',
      email: elements.email?.value?.trim() || '',
      phone: elements.phone?.value?.trim() || '',
      fullName: elements.fullName?.value?.trim() || ''
    };

    if (elements.password?.value && elements.password.value.trim()) {
      data.password = elements.password.value.trim();
    }

    if (AppState.isEditMode && AppState.currentEditingUserId) {
      // In edit mode, read checkbox states
      const isActiveEl = document.getElementById('isActive');
      const isPlusEl = document.getElementById('isPlusAccount'); 
      const isAdminEl = document.getElementById('isAdmin');
      
      data.status = isActiveEl && isActiveEl.checked ? 'active' : 'inactive';
      data.accountType = isPlusEl && isPlusEl.checked ? 'plus' : 'free';
      data.role = isAdminEl && isAdminEl.checked ? 'admin' : 'user';
      
      log('Edit mode form data extracted', {
        formData: data,
        checkboxElements: {
          isActive: isActiveEl?.checked,
          isPlusAccount: isPlusEl?.checked,
          isAdmin: isAdminEl?.checked
        },
        editingUserId: AppState.currentEditingUserId
      });
    } else {
      // Add mode defaults
      data.status = 'active';
      data.accountType = 'free';
      data.role = 'user';
      
      log('Add mode form data extracted', data);
    }

    return data;
  },

  // Populate form fields with user data
  populateFormFields(user) {
    if (elements.editUserId) elements.editUserId.value = user.id;
    if (elements.username) elements.username.value = user.username || '';
    if (elements.email) elements.email.value = user.email || '';
    if (elements.phone) elements.phone.value = user.phone || '';
    if (elements.fullName) elements.fullName.value = user.fullName || '';
    if (elements.password) elements.password.value = '';
    
    // Set checkboxes with explicit boolean values
    if (elements.isActive) {
      elements.isActive.checked = (user.status === 'active');
      log('Set isActive checkbox', { userStatus: user.status, checked: elements.isActive.checked });
    }
    
    if (elements.isPlusAccount) {
      elements.isPlusAccount.checked = (user.accountType === 'plus');
      log('Set isPlusAccount checkbox', { userAccountType: user.accountType, checked: elements.isPlusAccount.checked });
    }
    
    if (elements.isAdmin) {
      elements.isAdmin.checked = (user.role === 'admin');
      log('Set isAdmin checkbox', { userRole: user.role, checked: elements.isAdmin.checked });
    }
    
    log('Form fields populated', {
      user: user,
      checkboxStates: {
        isActive: elements.isActive?.checked,
        isPlusAccount: elements.isPlusAccount?.checked,
        isAdmin: elements.isAdmin?.checked
      }
    });
  },

  // Validate entire form
  validateForm() {
    let isValid = true;
    
    isValid = this.validateUsername() && isValid;
    isValid = this.validateEmail() && isValid;
    isValid = this.validateFullName() && isValid;
    
    if (!AppState.isEditMode) {
      isValid = this.validatePassword() && isValid;
    }
    
    return isValid;
  },

  // Validate username field
  validateUsername() {
    if (!elements.username) return true;
    
    const username = elements.username.value.trim();
    
    if (!username) {
      this.showFieldError('username', 'Username is required');
      return false;
    }
    
    if (username.length < 3) {
      this.showFieldError('username', 'Username must be at least 3 characters');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.showFieldError('username', 'Username can only contain letters, numbers, and underscores');
      return false;
    }
    
    const existingUser = AppState.allUsers.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      (!AppState.isEditMode || Number(u.id) !== Number(AppState.currentEditingUserId))
    );
    
    if (existingUser) {
      this.showFieldError('username', 'Username already exists');
      return false;
    }
    
    this.clearFieldError('username');
    return true;
  },

  // Validate email field
  validateEmail() {
    if (!elements.email) return true;
    
    const email = elements.email.value.trim();
    
    if (!email) {
      this.showFieldError('email', 'Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showFieldError('email', 'Please enter a valid email address');
      return false;
    }
    
    const existingUser = AppState.allUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      (!AppState.isEditMode || Number(u.id) !== Number(AppState.currentEditingUserId))
    );
    
    if (existingUser) {
      this.showFieldError('email', 'Email already exists');
      return false;
    }
    
    this.clearFieldError('email');
    return true;
  },

  // Validate full name field
  validateFullName() {
    if (!elements.fullName) return true;
    
    const fullName = elements.fullName.value.trim();
    
    if (!fullName) {
      this.showFieldError('fullName', 'Full name is required');
      return false;
    }
    
    if (fullName.length < 2) {
      this.showFieldError('fullName', 'Full name must be at least 2 characters');
      return false;
    }
    
    this.clearFieldError('fullName');
    return true;
  },

  // Validate password field
  validatePassword() {
    if (!elements.password) return true;
    
    const password = elements.password.value;
    
    if (!AppState.isEditMode && !password) {
      this.showFieldError('password', 'Password is required');
      return false;
    }
    
    if (password && password.length < 6) {
      this.showFieldError('password', 'Password must be at least 6 characters');
      return false;
    }
    
    this.clearFieldError('password');
    return true;
  },

  // Show field validation error
  showFieldError(fieldName, message) {
    const errorElement = document.getElementById(fieldName + 'Error');
    const inputElement = elements[fieldName];
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = '#dc3545';
      errorElement.style.fontSize = '12px';
      errorElement.style.fontWeight = '500';
    }
    
    if (inputElement) {
      inputElement.classList.add('has-error');
      inputElement.style.borderColor = '#667eea';
      inputElement.style.boxShadow = 'none';
      inputElement.style.transform = 'none';
      
      // Add shake animation
      inputElement.style.animation = 'shake 0.3s ease-in-out';
      setTimeout(() => {
        if (inputElement) inputElement.style.animation = '';
      }, 300);
    }
  },

  // Clear field validation error
  clearFieldError(fieldName) {
    const errorElement = document.getElementById(fieldName + 'Error');
    const inputElement = elements[fieldName];
    
    if (errorElement) errorElement.textContent = '';
    
    if (inputElement) {
      inputElement.classList.remove('has-error');
      inputElement.style.borderColor = '#667eea';
      inputElement.style.boxShadow = 'none';
      inputElement.style.transform = 'none';
    }
  },

  // Clear all validation errors
  clearValidationErrors() {
    const errorFields = ['username', 'email', 'fullName', 'password'];
    errorFields.forEach(field => this.clearFieldError(field));
    
    const formError = document.getElementById('formError');
    if (formError) formError.textContent = '';
  },

  // Handle form submission
  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (!this.validateForm()) {
      showToast('Validation Error', 'Please fix the errors below', 'error');
      return;
    }
    
    showButtonLoading(elements.saveBtn, elements.saveBtnText, elements.saveBtnLoader, true);
    
    try {
      const formData = this.getFormData();
      
      if (AppState.isEditMode && AppState.currentEditingUserId) {
        // Update existing user - DO NOT reload after update
        await updateUser(AppState.currentEditingUserId, formData);
      } else {
        // Create new user - reload to get fresh data from server
        await createUser(formData);
        await loadUsers();
      }
      
      hideUserModal();
      
    } catch (error) {
      log('Form submission error', error, 'error');
      showToast('Error', error.message || 'Operation failed', 'error');
    } finally {
      showButtonLoading(elements.saveBtn, elements.saveBtnText, elements.saveBtnLoader, false);
    }
  }
};

// Legacy wrapper functions for backward compatibility
function getFormData() {
  return AdminForms.getFormData();
}

function populateFormFields(user) {
  return AdminForms.populateFormFields(user);
}

function validateForm() {
  return AdminForms.validateForm();
}

function validateUsername() {
  return AdminForms.validateUsername();
}

function validateEmail() {
  return AdminForms.validateEmail();
}

function validateFullName() {
  return AdminForms.validateFullName();
}

function validatePassword() {
  return AdminForms.validatePassword();
}

function showFieldError(fieldName, message) {
  return AdminForms.showFieldError(fieldName, message);
}

function clearFieldError(fieldName) {
  return AdminForms.clearFieldError(fieldName);
}

function clearValidationErrors() {
  return AdminForms.clearValidationErrors();
}

async function handleFormSubmit(e) {
  return AdminForms.handleFormSubmit(e);
}

// Global exports
if (typeof window !== 'undefined') {
  window.AdminForms = AdminForms;
  window.getFormData = getFormData;
  window.populateFormFields = populateFormFields;
  window.validateForm = validateForm;
  window.validateUsername = validateUsername;
  window.validateEmail = validateEmail;
  window.validateFullName = validateFullName;
  window.validatePassword = validatePassword;
  window.showFieldError = showFieldError;
  window.clearFieldError = clearFieldError;
  window.clearValidationErrors = clearValidationErrors;
  window.handleFormSubmit = handleFormSubmit;
}