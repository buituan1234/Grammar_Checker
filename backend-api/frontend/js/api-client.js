// public/js/api-client.js - API Client for Frontend - FINAL FIXED
class ApiClient {
    constructor() {
        this.baseURL = window.location.origin + '/api';
        this.token = this.getStoredToken();
        this.retryCount = 0;
        this.maxRetries = 2;
    }

    // Get token from storage with fallback
    getStoredToken() {
        try {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        } catch (error) {
            console.warn('⚠️ Storage access failed:', error);
            return null;
        }
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            try {
                localStorage.setItem('authToken', token);
                sessionStorage.setItem('authToken', token);
                console.log('✅ Token stored successfully');
            } catch (error) {
                console.warn('⚠️ Failed to store token:', error);
            }
        } else {
            try {
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                console.log('🗑️ Token removed from storage');
            } catch (error) {
                console.warn('⚠️ Failed to remove token:', error);
            }
        }
    }

    // Get authentication token
    getToken() {
        return this.token || this.getStoredToken();
    }

    // Get headers with authentication
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Generic API request method with enhanced error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            console.log('🌐 API Request:', { 
                url, 
                method: config.method || 'GET',
                hasAuth: !!this.getToken()
            });
            
            const response = await fetch(url, config);
            
            // Handle different response types
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        data = { error: text };
                    }
                } else {
                    data = { success: response.ok };
                }
            }

            console.log('📋 API Response:', { 
                status: response.status, 
                success: data.success,
                hasData: !!data.data 
            });

            // Handle authentication errors
            if (response.status === 401 || response.status === 403) {
                console.warn('🔒 Authentication error, clearing token');
                this.setToken(null);
                
                // Don't throw error for verification endpoint
                if (endpoint === '/auth/verify') {
                    return { success: false, error: 'Token invalid' };
                }
                
                throw new Error(data.error || 'Authentication failed');
            }

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            this.retryCount = 0; // Reset retry count on success
            return data;
            
        } catch (error) {
            console.error('❌ API Error:', {
                endpoint,
                error: error.message,
                retryCount: this.retryCount
            });
            
            // Retry logic for network errors
            if (this.retryCount < this.maxRetries && 
                (error.name === 'TypeError' || error.message.includes('network'))) {
                this.retryCount++;
                console.log(`🔄 Retrying request (${this.retryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
                return this.request(endpoint, options);
            }
            
            this.retryCount = 0;
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        console.log('📝 Registering user:', userData.username);
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        console.log('🔑 Logging in user:', credentials.username);
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.success && response.data && response.data.token) {
            console.log('✅ Login successful, storing token');
            this.setToken(response.data.token);
        } else {
            console.warn('⚠️ Login response missing token:', response);
        }
        
        return response;
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');
            await this.request('/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            this.setToken(null);
            try {
                localStorage.removeItem('userData');
                sessionStorage.removeItem('userData');
            } catch (error) {
                console.warn('⚠️ Failed to clear user data:', error);
            }
        }
    }

    async verifyToken() {
        console.log('🔍 Verifying token...');
        try {
            const response = await this.request('/auth/verify', {
                method: 'GET'
            });
            
            if (response.success) {
                console.log('✅ Token verification successful');
            } else {
                console.warn('⚠️ Token verification failed');
                this.setToken(null);
            }
            
            return response;
        } catch (error) {
            console.warn('⚠️ Token verification error:', error.message);
            this.setToken(null);
            return { success: false, error: error.message };
        }
    }

    // Grammar check methods
    async checkGrammar(text, language = 'en-US') {
        return this.request('/grammar/check', {
            method: 'POST',
            body: JSON.stringify({ text, language })
        });
    }

    async getLanguages() {
        return this.request('/grammar/languages', {
            method: 'GET'
        });
    }

    async getUsage() {
        return this.request('/grammar/usage', {
            method: 'GET'
        });
    }

    // Admin methods
    async getUsers() {
        console.log('👥 Fetching users for admin...');
        return this.request('/auth/users', {
            method: 'GET'
        });
    }

    async updateUser(userId, userData) {
        console.log('✏️ Updating user:', userId);
        return this.request(`/auth/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(userId) {
        console.log('🗑️ Deleting user:', userId);
        return this.request(`/auth/users/${userId}`, {
            method: 'DELETE'
        });
    }
}

// Authentication helper functions
class AuthHelper {
    constructor() {
        this.api = new ApiClient();
    }

    // Check if user is logged in
    isLoggedIn() {
        const token = this.api.getToken();
        const userData = this.getUserData();
        const isLoggedIn = !!(token && userData);
        console.log('🔍 Login status check:', { hasToken: !!token, hasUserData: !!userData, isLoggedIn });
        return isLoggedIn;
    }

    // Get current user data with error handling
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.warn('⚠️ Failed to get user data:', error);
            return null;
        }
    }

    // Alternative method name for consistency
    getUserData() {
        return this.getCurrentUser();
    }

    // Save user data with error handling
    saveUserData(userData) {
        try {
            const dataString = JSON.stringify(userData);
            localStorage.setItem('userData', dataString);
            sessionStorage.setItem('userData', dataString);
            console.log('✅ User data saved:', userData.username);
        } catch (error) {
            console.warn('⚠️ Failed to save user data:', error);
        }
    }

    // Clear user data
    clearUserData() {
        try {
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            sessionStorage.removeItem('authToken');
            console.log('🗑️ User data cleared');
        } catch (error) {
            console.warn('⚠️ Failed to clear user data:', error);
        }
    }

    // Show/hide elements based on login status
    updateUIForAuthState() {
        const isLoggedIn = this.isLoggedIn();
        const userData = this.getCurrentUser();

        console.log('🎨 Updating UI for auth state:', { isLoggedIn, userData: !!userData });

        // Update login/logout buttons
        const loginBtn = document.querySelector('.login-btn');
        const logoutBtn = document.querySelector('.logout-btn');
        const userInfo = document.querySelector('.user-info');

        if (loginBtn) {
            loginBtn.style.display = isLoggedIn ? 'none' : 'block';
        }

        if (logoutBtn) {
            logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
        }

        if (userInfo && isLoggedIn && userData) {
            userInfo.textContent = `Welcome, ${userData.username}`;
            userInfo.style.display = 'block';
        } else if (userInfo) {
            userInfo.style.display = 'none';
        }
    }

    // Handle login form
    async handleLogin(formData) {
        try {
            console.log('🔑 Handling login for:', formData.username);
            const response = await this.api.login(formData);
            
            if (response.success && response.data) {
                this.saveUserData(response.data);
                this.updateUIForAuthState();
                console.log('✅ Login handled successfully');
                return response;
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    // Handle registration form
    async handleRegister(formData) {
        try {
            console.log('📝 Handling registration for:', formData.username);
            const response = await this.api.register(formData);
            
            if (response.success && response.data) {
                this.saveUserData(response.data);
                this.updateUIForAuthState();
                console.log('✅ Registration handled successfully');
                return response;
            } else {
                throw new Error(response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            console.log('🚪 Handling logout...');
            await this.api.logout();
            this.clearUserData();
            this.updateUIForAuthState();
            console.log('✅ Logout handled successfully');
            
            // Redirect to home page after a delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Clear data even if logout request fails
            this.clearUserData();
            this.updateUIForAuthState();
        }
    }

    // Verify token on page load with improved error handling
    async verifyAuth() {
        if (!this.isLoggedIn()) {
            console.log('⚠️ Not logged in, skipping auth verification');
            return false;
        }

        try {
            console.log('🔍 Verifying authentication...');
            const response = await this.api.verifyToken();
            
            if (response.success && response.data) {
                this.saveUserData(response.data);
                this.updateUIForAuthState();
                console.log('✅ Auth verification successful');
                return true;
            } else {
                console.warn('⚠️ Auth verification failed:', response.error);
                this.clearUserData();
                this.updateUIForAuthState();
                return false;
            }
        } catch (error) {
            console.error('❌ Auth verification error:', error);
            this.clearUserData();
            this.updateUIForAuthState();
            return false;
        }
    }
}

// Initialize global instances
const apiClient = new ApiClient();
const authHelper = new AuthHelper();

// Utility functions with better error handling
function showMessage(message, type = 'info') {
    console.log(`📢 Showing message [${type}]:`, message);
    
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
    `;

    // Set colors based on type
    switch (type) {
        case 'success':
            messageDiv.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#ff9800';
            break;
        default:
            messageDiv.style.backgroundColor = '#2196F3';
    }

    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function showLoading(show = true) {
    let loader = document.querySelector('.loading-overlay');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loading-overlay';
            loader.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            
            const spinner = loader.querySelector('.loading-spinner');
            spinner.style.cssText = `
                text-align: center;
                color: white;
            `;
            
            const spinnerDiv = loader.querySelector('.spinner');
            spinnerDiv.style.cssText = `
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 2s linear infinite;
                margin: 0 auto 20px;
            `;
            
            // Add spinner animation
            if (!document.querySelector('#spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Enhanced initialization with better error handling
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing auth helper...');
    
    try {
        // Only verify auth if we think we're logged in
        if (authHelper.isLoggedIn()) {
            authHelper.verifyAuth().catch(error => {
                console.warn('⚠️ Initial auth verification failed:', error);
                // Don't redirect here, let individual pages handle it
            });
        } else {
            console.log('ℹ️ Not logged in, skipping auth verification');
        }
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

// Handle page visibility changes to refresh auth
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && authHelper.isLoggedIn()) {
        console.log('👁️ Page became visible, checking auth status...');
        authHelper.verifyAuth().catch(error => {
            console.warn('⚠️ Auth check on visibility change failed:', error);
        });
    }
});

// Export for use in other scripts
window.apiClient = apiClient;
window.authHelper = authHelper;
window.showMessage = showMessage;
window.showLoading = showLoading;

console.log('✅ API Client and Auth Helper initialized successfully');