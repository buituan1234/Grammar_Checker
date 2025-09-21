/**
 * admin-state.js
 * Application state management
 */

'use strict';

// Global application state
const AppState = {
  allUsers: [],
  filteredUsers: [],
  currentEditingUserId: null,
  isEditMode: false,
  isDebugMode: false,
  isLoading: false,
  autoRefreshTimer: null,
  searchTimeout: null,
  currentUser: null
};

// DOM elements cache
let elements = {};

// State management functions
const AdminState = {
  // Users management
  setUsers(users) {
    AppState.allUsers = users;
    AppState.filteredUsers = [...users];
  },

  addUser(user) {
    AppState.allUsers.push(user);
    AppState.filteredUsers = [...AppState.allUsers];
  },

  updateUser(userId, updatedUser) {
    const index = AppState.allUsers.findIndex(u => Number(u.id) === Number(userId));
    if (index >= 0) {
      AppState.allUsers[index] = updatedUser;
      AppState.filteredUsers = [...AppState.allUsers];
    }
  },

  removeUser(userId) {
    AppState.allUsers = AppState.allUsers.filter(u => Number(u.id) !== Number(userId));
    AppState.filteredUsers = [...AppState.allUsers];
  },

  filterUsers(searchTerm) {
    if (!searchTerm) {
      AppState.filteredUsers = [...AppState.allUsers];
    } else {
      AppState.filteredUsers = AppState.allUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm) ||
        user.fullName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.phone && user.phone.toLowerCase().includes(searchTerm))
      );
    }
  },

  getUserById(userId) {
    return AppState.allUsers.find(u => Number(u.id) === Number(userId));
  },

  // Edit mode management
  setEditMode(userId) {
    AppState.isEditMode = true;
    AppState.currentEditingUserId = userId;
  },

  clearEditMode() {
    AppState.isEditMode = false;
    AppState.currentEditingUserId = null;
  },

  // Loading state
  setLoading(isLoading) {
    AppState.isLoading = isLoading;
  },

  // Debug mode
  toggleDebug() {
    AppState.isDebugMode = !AppState.isDebugMode;
  }
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.AppState = AppState;
  window.AdminState = AdminState;
  window.elements = elements;
}