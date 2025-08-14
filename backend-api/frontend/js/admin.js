// public/js/admin.js - Complete admin panel logic FIXED
let users = [];
let filteredUsers = [];
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 10;
let currentEditUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Admin panel initializing...');
    
    // Wait for API client to be available
    if (typeof apiClient === 'undefined' || typeof authHelper === 'undefined') {
        console.log('⏳ Waiting for API client to load...');
        setTimeout(() => {
            checkAdminAuth();
            initializeAdminPanel();
        }, 500);
    } else {
        checkAdminAuth();
        initializeAdminPanel();
    }
});

async function checkAdminAuth() {
    try {
        console.log('🔍 Checking admin authentication...');
        
        if (!authHelper.isLoggedIn()) {
            console.log('❌ Not logged in, redirecting...');
            showMessage('Please login to access admin panel', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }

        console.log('✅ User appears to be logged in, verifying token...');
        
        // Verify authentication with server
        const isValid = await authHelper.verifyAuth();
        if (!isValid) {
            console.log('❌ Token verification failed');
            showMessage('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }

        console.log('✅ Authentication verified successfully');
        
        // Check if user is admin
        const userData = authHelper.getCurrentUser();
        console.log('👤 Current user data:', userData);
        
        if (!userData || !userData.isAdmin) {
            console.log('❌ User is not admin:', userData);
            showMessage('Admin access required', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }

        console.log('✅ Admin access confirmed, loading users...');
        
        // Load users data
        await loadUsers();
        
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        showMessage('Authentication failed: ' + error.message, 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }
}

function initializeAdminPanel() {
    console.log('🔧 Initializing admin panel components...');
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterUsers(searchTerm);
        });
        console.log('✅ Search functionality initialized');
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutLink');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showLogoutModal();
        });
        console.log('✅ Logout button initialized');
    }

    // Confirm logout
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', async function() {
            await handleLogout();
        });
    }

    // Add user form
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddUser();
        });
        console.log('✅ Add user form initialized');
    }

    // Edit user form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleEditUser();
        });
        console.log('✅ Edit user form initialized');
    }

    // Pagination
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                displayUsers();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                displayUsers();
            }
        });
    }

    console.log('✅ Admin panel initialization complete');
}

async function loadUsers() {
    try {
        console.log('🔄 Loading users...');
        showLoadingState(true);
        
        const response = await apiClient.getUsers();
        console.log('📊 Users response:', response);
        
        if (response.success) {
            users = response.data || [];
            filteredUsers = [...users];
            console.log(`✅ Loaded ${users.length} users`);
            updateStats();
            displayUsers();
            showMessage('Users loaded successfully', 'success');
        } else {
            throw new Error(response.error || 'Failed to load users');
        }
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        
        // Check if it's an authentication error
        if (error.message.includes('401') || error.message.includes('403')) {
            showMessage('Session expired. Please login again.', 'error');
            setTimeout(() => {
                authHelper.clearUserData();
                window.location.href = '/';
            }, 2000);
        } else {
            showMessage('Failed to load users: ' + error.message, 'error');
            showEmptyState('Failed to load users');
        }
    } finally {
        showLoadingState(false);
    }
}

function updateStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.IsActive).length;
    const premiumUsers = users.filter(u => u.IsPremium).length;

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('premiumUsers').textContent = premiumUsers;
    
    console.log(`📊 Stats updated - Total: ${totalUsers}, Active: ${activeUsers}, Premium: ${premiumUsers}`);
}

function filterUsers(searchTerm) {
    if (!searchTerm) {
        filteredUsers = [...users];
    } else {
        filteredUsers = users.filter(user => 
            (user.Username && user.Username.toLowerCase().includes(searchTerm)) ||
            (user.Email && user.Email.toLowerCase().includes(searchTerm)) ||
            (user.FullName && user.FullName.toLowerCase().includes(searchTerm)) ||
            (user.Phone && user.Phone.toLowerCase().includes(searchTerm))
        );
    }
    
    currentPage = 1;
    displayUsers();
    console.log(`🔍 Filtered users: ${filteredUsers.length} results for "${searchTerm}"`);
}

function displayUsers() {
    const tbody = document.querySelector('#userTable');
    if (!tbody) {
        console.error('❌ User table not found');
        return;
    }

    // Calculate pagination
    totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    // Update pagination info
    updatePaginationInfo();

    if (pageUsers.length === 0) {
        showEmptyState(filteredUsers.length === 0 ? 'No users found' : 'No users match your search');
        return;
    }

    tbody.innerHTML = pageUsers.map(user => `
        <tr>
            <td><strong>${user.UserID}</strong></td>
            <td>${escapeHtml(user.Username || '')}</td>
            <td>${escapeHtml(user.Email || '')}</td>
            <td>${escapeHtml(user.FullName || 'N/A')}</td>
            <td>${escapeHtml(user.Phone || 'N/A')}</td>
            <td>
                <span class="status-badge ${user.IsActive ? 'status-active' : 'status-inactive'}">
                    ${user.IsActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.IsPremium ? 'status-premium' : 'status-free'}">
                    ${user.IsPremium ? 'Premium' : 'Free'}
                </span>
            </td>
            <td>
                <div class="action-icons">
                    <button class="btn-edit" onclick="openEditModal(${user.UserID})" title="Edit User">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-delete" onclick="confirmDeleteUser(${user.UserID})" title="Delete User">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    console.log(`📋 Displayed ${pageUsers.length} users on page ${currentPage}/${totalPages}`);
}

function updatePaginationInfo() {
    const pageInfo = document.getElementById('pageInfo');
    const totalCount = document.getElementById('totalCount');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (totalCount) totalCount.textContent = filteredUsers.length;
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function showEmptyState(message) {
    const tbody = document.querySelector('#userTable');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="bi bi-people"></i>
                        <p>${message}</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function showLoadingState(show) {
    const tbody = document.querySelector('#userTable');
    if (!tbody) return;

    if (show) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="8">
                    <div class="loading-spinner"></div>
                    Loading users...
                </td>
            </tr>
        `;
    }
}

async function handleAddUser() {
    try {
        console.log('➕ Adding new user...');
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username').trim(),
            email: formData.get('email').trim(),
            fullName: formData.get('fullName').trim(),
            phone: formData.get('phone').trim(),
            password: 'default123', // Default password for admin-created users
            isActive: formData.get('isActive') === 'on',
            isPremium: formData.get('isPremium') === 'on'
        };

        console.log('📝 User data to add:', userData);

        // Validation
        if (!userData.username || !userData.email) {
            showMessage('Username and email are required', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }

        // Check if user already exists
        const existingUser = users.find(u => 
            u.Username.toLowerCase() === userData.username.toLowerCase() ||
            u.Email.toLowerCase() === userData.email.toLowerCase()
        );

        if (existingUser) {
            showMessage('Username or email already exists', 'error');
            return;
        }

        const response = await apiClient.register(userData);
        
        if (response.success) {
            showMessage('User created successfully', 'success');
            closeModal('addUserModal');
            form.reset();
            await loadUsers(); // Reload users list
        } else {
            throw new Error(response.error);
        }

    } catch (error) {
        console.error('❌ Error creating user:', error);
        showMessage('Failed to create user: ' + error.message, 'error');
    }
}

function openEditModal(userId) {
    console.log('✏️ Opening edit modal for user ID:', userId);
    const user = users.find(u => u.UserID === userId);
    if (!user) {
        showMessage('User not found', 'error');
        return;
    }

    currentEditUser = user;
    
    // Fill form with user data
    document.getElementById('editUserId').value = user.UserID;
    document.getElementById('editUsername').value = user.Username || '';
    document.getElementById('editEmail').value = user.Email || '';
    document.getElementById('editFullName').value = user.FullName || '';
    document.getElementById('editPhone').value = user.Phone || '';
    document.getElementById('editIsActive').checked = user.IsActive;
    document.getElementById('editIsPremium').checked = user.IsPremium;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

async function handleEditUser() {
    try {
        if (!currentEditUser) {
            showMessage('No user selected for editing', 'error');
            return;
        }

        console.log('✏️ Editing user:', currentEditUser.Username);

        const userData = {
            username: currentEditUser.Username, // Keep original
            email: currentEditUser.Email, // Keep original
            fullName: document.getElementById('editFullName').value.trim(),
            phone: document.getElementById('editPhone').value.trim(),
            isActive: document.getElementById('editIsActive').checked,
            isPremium: document.getElementById('editIsPremium').checked
        };

        console.log('📝 Updated user data:', userData);

        const response = await apiClient.updateUser(currentEditUser.UserID, userData);
        
        if (response.success) {
            showMessage('User updated successfully', 'success');
            closeModal('editUserModal');
            currentEditUser = null;
            await loadUsers(); // Reload users list
        } else {
            throw new Error(response.error);
        }

    } catch (error) {
        console.error('❌ Error updating user:', error);
        showMessage('Failed to update user: ' + error.message, 'error');
    }
}

function confirmDeleteUser(userId) {
    const user = users.find(u => u.UserID === userId);
    if (!user) {
        showMessage('User not found', 'error');
        return;
    }

    console.log('🗑️ Confirming delete for user:', user.Username);

    const confirmed = confirm(
        `Are you sure you want to delete user "${user.Username}"?\n\n` +
        `This action cannot be undone and will permanently remove:\n` +
        `- User account and profile\n` +
        `- All user data and history\n` +
        `- Access permissions\n\n` +
        `Type "DELETE" to confirm this action.`
    );

    if (confirmed) {
        const verification = prompt('Please type "DELETE" to confirm:');
        if (verification === 'DELETE') {
            deleteUser(userId);
        } else {
            showMessage('Deletion cancelled - verification failed', 'info');
        }
    }
}

async function deleteUser(userId) {
    try {
        console.log('🗑️ Deleting user ID:', userId);
        const response = await apiClient.deleteUser(userId);
        
        if (response.success) {
            showMessage('User deleted successfully', 'success');
            await loadUsers(); // Reload users list
        } else {
            throw new Error(response.error);
        }

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        showMessage('Failed to delete user: ' + error.message, 'error');
    }
}

function showLogoutModal() {
    const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
    modal.show();
}

async function handleLogout() {
    try {
        console.log('🚪 Logging out...');
        await authHelper.handleLogout();
        showMessage('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showMessage('Logout failed', 'error');
    }
}

function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

function showMessage(message, type = 'info') {
    console.log(`📢 Message [${type}]:`, message);
    
    // Try using bootstrap toasts first
    let toastElement, messageElement;
    
    if (type === 'error') {
        toastElement = document.getElementById('toastError');
        messageElement = document.getElementById('toastErrorMessage');
    } else {
        toastElement = document.getElementById('toastSuccess');
        messageElement = document.getElementById('toastSuccessMessage');
    }
    
    if (toastElement && messageElement) {
        messageElement.textContent = message;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    } else {
        // Fallback to global showMessage function if available
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            alert(message); // Ultimate fallback
        }
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-refresh users every 5 minutes (reduced frequency to avoid auth issues)
let refreshInterval;
function startAutoRefresh() {
    refreshInterval = setInterval(async () => {
        try {
            if (authHelper.isLoggedIn()) {
                console.log('🔄 Auto-refreshing users...');
                await loadUsers();
            } else {
                console.log('⚠️ Not logged in, stopping auto-refresh');
                clearInterval(refreshInterval);
            }
        } catch (error) {
            console.log('❌ Auto-refresh failed:', error);
            // Don't show error message for auto-refresh failures
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Start auto-refresh after successful authentication
setTimeout(() => {
    if (authHelper && authHelper.isLoggedIn()) {
        startAutoRefresh();
    }
}, 10000); // Wait 10 seconds before starting auto-refresh

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N to add new user
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const addModal = new bootstrap.Modal(document.getElementById('addUserModal'));
        addModal.show();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }
});

// Export functions for global access
window.openEditModal = openEditModal;
window.confirmDeleteUser = confirmDeleteUser;

console.log('✅ Admin script loaded successfully');