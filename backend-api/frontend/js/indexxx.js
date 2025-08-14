// indexxx.js - Working Free Trial Grammar Checker
console.log('🚀 indexxx.js loading...');

// Free usage tracking
let freeUsageCount = parseInt(localStorage.getItem('freeUsageCount') || '0');
const MAX_FREE_USAGE = 3;

// API Base URL
const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') 
  ? 'http://localhost:3000' 
  : window.location.origin;

console.log('API Base URL:', API_BASE_URL);

// =============================================================================
// MODAL FUNCTIONS - DEFINED FIRST
// =============================================================================

function openModal(modalId) {
    console.log('🔓 Opening modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        // Apply enhanced modal styling
        modal.style.cssText = `
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
            visibility: visible;
            opacity: 1;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            if (modalId === 'loginModal') {
                // Login modal with left panel
                modalContent.style.cssText = `
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                    max-width: 900px;
                    width: 90%;
                    min-height: 600px;
                    position: relative;
                    display: flex;
                    overflow: hidden;
                    animation: modalSlideIn 0.4s ease-out forwards;
                `;
                
                // Style the container
                const container = modalContent.querySelector('.container');
                if (container) {
                    container.style.cssText = `
                        display: flex;
                        width: 100%;
                        min-height: 600px;
                    `;
                }
                
                // Style left box
                const leftBox = modalContent.querySelector('.left-box');
                if (leftBox) {
                    leftBox.style.cssText = `
                        flex: 1;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 60px 40px;
                    `;
                    
                    const h1 = leftBox.querySelector('h1');
                    if (h1) {
                        h1.style.cssText = `
                            font-size: 3rem;
                            text-align: center;
                            line-height: 1.2;
                            font-weight: 700;
                            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
                            margin: 0;
                        `;
                    }
                }
            } else {
                // Register modal (single panel)
                modalContent.style.cssText = `
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                    max-width: 600px;
                    width: 90%;
                    min-height: 700px;
                    position: relative;
                    overflow: hidden;
                    animation: modalSlideIn 0.4s ease-out forwards;
                `;
            }
            
            // Style the form
            const registerForm = modalContent.querySelector('.register-form');
            if (registerForm) {
                registerForm.style.cssText = `
                    flex: 1;
                    padding: 60px 50px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                `;
                
                // Style form title
                const h2 = registerForm.querySelector('h2');
                if (h2) {
                    h2.style.cssText = `
                        font-size: 2.5rem;
                        color: #2d3748;
                        margin-bottom: 40px;
                        text-align: center;
                        font-weight: 600;
                    `;
                }
                
                // Style inputs
                const inputs = registerForm.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"]');
                inputs.forEach(input => {
                    input.style.cssText = `
                        width: 100%;
                        padding: 18px 20px;
                        margin-bottom: 25px;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        transition: all 0.3s ease;
                        background: #f8fafc;
                        box-sizing: border-box;
                    `;
                    
                    // Focus effects
                    input.addEventListener('focus', function() {
                        this.style.borderColor = modalId === 'loginModal' ? '#667eea' : '#48bb78';
                        this.style.boxShadow = modalId === 'loginModal' 
                            ? '0 0 0 3px rgba(102, 126, 234, 0.1)' 
                            : '0 0 0 3px rgba(72, 187, 120, 0.1)';
                        this.style.background = 'white';
                    });
                    
                    input.addEventListener('blur', function() {
                        this.style.borderColor = '#e2e8f0';
                        this.style.boxShadow = 'none';
                        this.style.background = '#f8fafc';
                    });
                });
                
                // Style password wrapper
                const passwordWrappers = registerForm.querySelectorAll('.password-wrapper');
                passwordWrappers.forEach(wrapper => {
                    wrapper.style.cssText = `
                        position: relative;
                        margin-bottom: 25px;
                    `;
                    
                    const toggle = wrapper.querySelector('.toggle-password');
                    if (toggle) {
                        toggle.style.cssText = `
                            position: absolute;
                            right: 20px;
                            top: 50%;
                            transform: translateY(-50%);
                            cursor: pointer;
                            font-size: 1.3rem;
                            color: #718096;
                            transition: color 0.3s ease;
                            z-index: 10;
                        `;
                        
                        toggle.addEventListener('mouseenter', function() {
                            this.style.color = modalId === 'loginModal' ? '#667eea' : '#48bb78';
                        });
                        
                        toggle.addEventListener('mouseleave', function() {
                            this.style.color = '#718096';
                        });
                    }
                });
                
                // Style submit button
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    const gradientColor = modalId === 'loginModal' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                    
                    submitBtn.style.cssText = `
                        width: 100%;
                        padding: 18px;
                        background: ${gradientColor};
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.2rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin-top: 20px;
                    `;
                    
                    submitBtn.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-2px)';
                        this.style.boxShadow = modalId === 'loginModal'
                            ? '0 10px 25px rgba(102, 126, 234, 0.3)'
                            : '0 10px 25px rgba(72, 187, 120, 0.3)';
                    });
                    
                    submitBtn.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = 'none';
                    });
                }
                
                // Style remember checkbox
                const remember = registerForm.querySelector('.remember');
                if (remember) {
                    remember.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 30px;
                        font-size: 1rem;
                        color: #4a5568;
                    `;
                }
                
                // Style links
                const links = registerForm.querySelectorAll('.login-link');
                links.forEach(link => {
                    link.style.cssText = `
                        text-align: center;
                        margin-top: 30px;
                        font-size: 1rem;
                        color: #718096;
                    `;
                    
                    const anchor = link.querySelector('a');
                    if (anchor) {
                        anchor.style.cssText = `
                            color: ${modalId === 'loginModal' ? '#667eea' : '#48bb78'};
                            text-decoration: none;
                            font-weight: 600;
                            transition: color 0.3s ease;
                        `;
                        
                        anchor.addEventListener('mouseenter', function() {
                            this.style.color = modalId === 'loginModal' ? '#764ba2' : '#38a169';
                            this.style.textDecoration = 'underline';
                        });
                        
                        anchor.addEventListener('mouseleave', function() {
                            this.style.color = modalId === 'loginModal' ? '#667eea' : '#48bb78';
                            this.style.textDecoration = 'none';
                        });
                    }
                });
            }
        }
        
        // Style close button
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.style.cssText = `
                position: absolute;
                top: 20px;
                right: 25px;
                font-size: 2rem;
                cursor: pointer;
                color: #a0aec0;
                z-index: 1001;
                transition: all 0.3s ease;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.9);
            `;
            
            closeBtn.addEventListener('mouseenter', function() {
                this.style.color = '#e53e3e';
                this.style.background = 'white';
                this.style.transform = 'scale(1.1)';
            });
            
            closeBtn.addEventListener('mouseleave', function() {
                this.style.color = '#a0aec0';
                this.style.background = 'rgba(255, 255, 255, 0.9)';
                this.style.transform = 'scale(1)';
            });
        }
        
        // Add slide-in animation
        if (!document.getElementById('modalAnimationStyles')) {
            const style = document.createElement('style');
            style.id = 'modalAnimationStyles';
            style.textContent = `
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.7) translateY(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Clear any previous errors
        const loginError = document.getElementById('loginError');
        const passwordError = document.getElementById('passwordError');
        const phoneError = document.getElementById('phoneError');
        
        if (loginError) loginError.textContent = '';
        if (passwordError) passwordError.textContent = '';
        if (phoneError) phoneError.textContent = '';
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input[type="text"], input[type="email"]');
            if (firstInput) firstInput.focus();
        }, 100);
        
        console.log('✅ Enhanced modal opened successfully');
    } else {
        console.error('❌ Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    console.log('🔒 Closing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        
        // Clear form data and errors
        if (modalId === 'loginModal') {
            const loginForm = document.getElementById('loginForm');
            const loginError = document.getElementById('loginError');
            if (loginForm) loginForm.reset();
            if (loginError) loginError.textContent = '';
        } else if (modalId === 'registerModal') {
            const registerForm = document.getElementById('registerForm');
            const passwordError = document.getElementById('passwordError');
            const phoneError = document.getElementById('phoneError');
            if (registerForm) registerForm.reset();
            if (passwordError) passwordError.textContent = '';
            if (phoneError) phoneError.textContent = '';
        }
        console.log('✅ Modal closed successfully');
    }
}

function switchModal(closeId, openId) {
    console.log('🔄 Switching modal from', closeId, 'to', openId);
    closeModal(closeId);
    setTimeout(() => openModal(openId), 300);
}

function togglePassword(element) {
    const passwordInput = element.previousElementSibling;
    const toggleIcon = element;
    if (passwordInput && passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈';
    } else if (passwordInput) {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️';
    }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

// Generate or get session ID
function getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Check authentication status
function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return token !== null && token !== 'null' && token !== '';
}

// API call helper
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId(),
        ...options.headers
    };

    const authToken = localStorage.getItem('authToken');
    if (authToken && authToken !== 'null') {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        method: 'GET',
        headers,
        ...options
    };

    try {
        console.log('📡 Making API call:', { url, method: config.method });
        
        const response = await fetch(url, config);
        const data = await response.json();

        console.log('📨 API response:', { status: response.status, success: data.success });

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('❌ API call failed:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Cannot connect to server. Please make sure the server is running on http://localhost:3000');
        }
        
        throw error;
    }
}

// =============================================================================
// AUTH HANDLERS
// =============================================================================

async function handleLogin(event) {
    event.preventDefault();
    
    console.log('🔐 Login form submitted');
    
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value?.trim();
    const loginError = document.getElementById('loginError');

    if (loginError) loginError.textContent = '';

    if (!username || !password) {
        if (loginError) loginError.textContent = 'Please enter both username and password';
        return;
    }

    try {
        showLoading(true);
        
        console.log('🔍 Attempting login with:', { username, passwordLength: password.length });
        
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        console.log('✅ Login result:', result);

        if (result.success) {
            // Store user data
            localStorage.setItem('authToken', result.data.token);
            localStorage.setItem('username', result.data.username);
            localStorage.setItem('email', result.data.email);
            localStorage.setItem('isPremium', result.data.isPremium);
            
            // Store full user data for role checking
            localStorage.setItem('userData', JSON.stringify({
                username: result.data.username,
                email: result.data.email,
                isPremium: result.data.isPremium,
                isAdmin: result.data.isAdmin || false
            }));
            
            showToast("✅ Login successful! Redirecting...");
            closeModal('loginModal');
            
            // Role-based redirection
            setTimeout(() => {
                if (result.data.isAdmin || result.data.username === 'admin') {
                    console.log('🔐 Admin user - redirecting to admin panel');
                    window.location.href = 'admin.html';
                } else {
                    console.log('👤 Regular user - redirecting to main app');
                    window.location.href = 'index.html';
                }
            }, 1500);
        } else {
            console.error('❌ Login failed:', result.error);
            if (loginError) loginError.textContent = result.error || 'Login failed';
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        if (loginError) {
            loginError.textContent = error.message || 'Login failed. Please try again.';
        }
    } finally {
        showLoading(false);
    }
}

async function handleRegister(event) {
    event.preventDefault();

    console.log('📝 Register form submitted');

    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const phone = document.getElementById('phone')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const passwordError = document.getElementById('passwordError');
    const phoneError = document.getElementById('phoneError');

    // Clear previous errors
    if (passwordError) passwordError.textContent = '';
    if (phoneError) phoneError.textContent = '';

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!username || !password || !email) {
        if (phoneError) phoneError.textContent = 'Username, password, and email are required';
        return;
    }

    if (!emailRegex.test(email)) {
        if (phoneError) phoneError.textContent = 'Invalid email format';
        return;
    }

    if (phone && !phoneRegex.test(phone)) {
        if (phoneError) phoneError.textContent = 'Phone number must have 10 digits';
        return;
    }

    if (password.length < 6) {
        if (passwordError) passwordError.textContent = 'Password must be at least 6 characters long';
        return;
    }

    try {
        showLoading(true);
        
        console.log('🔍 Attempting registration with:', { username, email, phone: phone || 'not provided' });
        
        const result = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email, phone })
        });

        console.log('✅ Registration result:', result);

        if (result.success) {
            // Store user data immediately after registration
            localStorage.setItem('authToken', result.data.token);
            localStorage.setItem('username', result.data.username);
            localStorage.setItem('email', result.data.email);
            localStorage.setItem('isPremium', result.data.isPremium || false);
            
            localStorage.setItem('userData', JSON.stringify({
                username: result.data.username,
                email: result.data.email,
                isPremium: result.data.isPremium || false,
                isAdmin: false
            }));
            
            showToast('✅ Registration successful! Redirecting...');
            closeModal('registerModal');
            
            setTimeout(() => {
                console.log('👤 New user - redirecting to main app');
                window.location.href = 'index.html';
            }, 1500);
        } else {
            console.error('❌ Registration failed:', result.error);
            if (phoneError) phoneError.textContent = result.error || 'Registration failed';
        }
    } catch (error) {
        console.error('❌ Registration error:', error);
        if (phoneError) {
            phoneError.textContent = error.message || 'Registration failed. Please try again.';
        }
    } finally {
        showLoading(false);
    }
}

// =============================================================================
// UI FUNCTIONS
// =============================================================================

function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3',
        warning: '#ff9800'
    };
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 300px;
        text-align: center;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

function showLoading(show = true) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
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
            
            overlay.innerHTML = `
                <div style="text-align: center; color: white;">
                    <div style="
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p>Loading...</p>
                </div>
            `;
            
            // Add animation
            if (!document.getElementById('loadingStyles')) {
                const style = document.createElement('style');
                style.id = 'loadingStyles';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// =============================================================================
// GRAMMAR CHECKER CLASS (YOUR ORIGINAL LOGIC)
// =============================================================================

class GrammarChecker {
    constructor() {
        console.log('🤖 Initializing GrammarChecker...');
        this.initializeElements();
        this.bindEvents();
        this.currentMatches = [];
        this.originalText = '';
        this.loadUserSettings();
        this.checkUsageLimit();
        console.log('✅ GrammarChecker initialized');
    }

    initializeElements() {
        this.textInput = document.getElementById('textInput');
        this.checkBtn = document.getElementById('checkBtn');
        this.btnText = document.getElementById('btnText');
        this.loading = document.getElementById('loading');
        this.languageSelect = document.getElementById('languageSelect');
        this.highlightedText = document.getElementById('highlightedText');
        this.suggestionsPanel = document.getElementById('suggestionsPanel');
        this.wordCount = document.getElementById('wordCount');
        this.charCount = document.getElementById('charCount');
        this.errorCount = document.getElementById('errorCount');
    }

    bindEvents() {
        if (this.checkBtn) {
            this.checkBtn.addEventListener('click', () => this.checkGrammar());
        }
        if (this.textInput) {
            this.textInput.addEventListener('input', () => this.updateStats());
            this.textInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.checkGrammar();
                }
            });
        }
    }

    loadUserSettings() {
        const userData = JSON.parse(localStorage.getItem('userSettings')) || {};
        // For free trial, no settings to load
    }

    updateStats() {
        const text = this.textInput?.value || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        if (this.wordCount) this.wordCount.textContent = words;
        if (this.charCount) this.charCount.textContent = chars;
    }

    isAuthenticated() {
        return localStorage.getItem('authToken') !== null && localStorage.getItem('authToken') !== 'null';
    }

    checkUsageLimit() {
        if (!this.isAuthenticated()) {
            this.updateUsageDisplay();
            if (freeUsageCount >= MAX_FREE_USAGE) {
                this.showUsageLimitReached();
            }
        }
    }

    showUsageLimitReached() {
        this.showError(`You have reached the free usage limit (${MAX_FREE_USAGE}/${MAX_FREE_USAGE}). Please login to continue using the service.`);
        if (this.checkBtn) this.checkBtn.disabled = true;
        
        const loginPrompt = document.createElement('div');
        loginPrompt.style.cssText = `
            text-align: center;
            margin-top: 15px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
        `;
        loginPrompt.innerHTML = `
            <p style="margin-bottom: 10px; color: #856404;">To continue checking grammar, please login to your account.</p>
            <button onclick="openModal('loginModal')" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            ">Go to Login</button>
        `;
        
        if (this.highlightedText && this.highlightedText.parentNode) {
            this.highlightedText.parentNode.appendChild(loginPrompt);
        }
    }

    updateUsageDisplay() {
        if (!this.isAuthenticated()) {
            const remaining = MAX_FREE_USAGE - freeUsageCount;
            const usageDisplay = document.createElement('div');
            usageDisplay.id = 'usageDisplay';
            usageDisplay.style.cssText = `
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
                text-align: center;
                color: #1976d2;
                font-weight: 500;
            `;
            usageDisplay.innerHTML = `Free checks remaining: ${remaining}/${MAX_FREE_USAGE}`;
            
            const oldDisplay = document.getElementById('usageDisplay');
            if (oldDisplay) oldDisplay.remove();
            
            if (this.textInput && this.textInput.parentNode) {
                this.textInput.parentNode.insertBefore(usageDisplay, this.textInput);
            }
        }
    }

    showError(message) {
        if (this.highlightedText) {
            this.highlightedText.innerHTML = `
                <div class="error-message">
                    <strong>❌ Error:</strong> ${message}
                </div>
            `;
        }
    }

    showSuccess() {
        if (this.highlightedText) {
            this.highlightedText.innerHTML = `
                <div class="success-message">
                    <strong>✅ Perfect!</strong><br>
                    No grammar errors found in your text.
                </div>
            `;
        }
    }

    showToast(message, type = 'success') {
        showToast(message, type);
    }

    // Your original language detection logic
    detectLanguage(text) {
        const patterns = {
            'de-DE': {
                chars: /[äöüßÄÖÜ]/g,
                words: /\b(der|die|das|und|ist|sind|ich|wir|sie|er|es|haben|hat|wird|wurde|werden|mit|von|zu|in|auf|für|als|aber|oder|wenn|dann|auch|noch|nur|schon|sehr|so|wie|was|wo|wer|warum|wann|ein|eine|einen|einem|einer|eines|nicht|kann|will|soll|muss|darf|mag|möchte|könnte|würde|sollte|müsste|dürfte|mögen|meine|mein|schwester|fährt|audi)\b/gi
            },
            'fr': {
                chars: /[àâäéèêëïîôöùûüÿç]/g,
                words: /\b(le|la|les|et|est|sont|je|nous|vous|ils|elles|avoir|être|faire|dire|aller|voir|savoir|pouvoir|falloir|vouloir|venir|prendre|donner|avec|dans|pour|sur|par|comme|mais|ou|si|tout|même|bien|encore|aussi|déjà|toujours|jamais|plus|moins|beaucoup|peu|très|assez|trop|un|une|des|du|de|cette|ce|ces|que|qui|dont|où|ne|pas|non|oui)\b/gi
            },
            'es': {
                chars: /[ñáéíóúü]/g,
                words: /\b(el|la|los|las|y|es|son|yo|nosotros|ellos|ser|estar|tener|hacer|decir|ir|ver|saber|poder|querer|venir|dar|llevar|con|en|para|por|como|pero|o|si|todo|mismo|bien|aún|también|ya|siempre|nunca|más|menos|mucho|poco|muy|bastante|demasiado|un|una|unos|unas|del|al|esta|este|estos|estas|que|qué|quien|quién|donde|dónde|cuando|cuándo|no|sí)\b/gi
            },
            'nl': {
                chars: /\b(ij|zij|wij|mij|jij)\b/gi,
                words: /\b(de|het|en|is|zijn|ik|wij|zij|hij|hebben|heeft|zal|zou|worden|met|van|in|op|voor|als|maar|of|dus|want|omdat|zodat|terwijl|hoewel|indien|wanneer|waar|wie|wat|hoe|waarom|heel|zeer|erg|best|goed|slecht|groot|klein|nieuw|oud|jong|mooi|lelijk|een|alle|deze|dit|die|dat|niet|wel|ja|nee)\b/gi
            },
            'en-US': {
                chars: /^[a-zA-Z\s.,!?;:'"()\-0-9]+$/,
                words: /\b(the|and|is|are|was|were|have|has|will|would|I|we|you|he|she|it|they|this|that|with|from|to|of|in|on|at|by|for|as|but|or|if|all|any|some|each|every|other|another|such|only|own|same|so|than|too|very|can|could|should|may|might|must|shall|here|there|where|when|why|how|what|who|which|color|center|realize|organize|analyze|a|an|be|do|go|get|make|take|come|see|know|think|feel|work|play|run|walk|talk|look|find|give|say|tell|ask|help|use|try|want|need|like|love|hate|good|bad|big|small|new|old|young|beautiful|ugly|not|yes|no|my|sister|drives|car)\b/gi
            },
            'en-GB': {
                chars: /^[a-zA-Z\s.,!?;:'"()\-0-9]+$/,
                words: /\b(the|and|is|are|was|were|have|has|will|would|I|we|you|he|she|it|they|this|that|with|from|to|of|in|on|at|by|for|as|but|or|if|all|any|some|each|every|other|another|such|only|own|same|so|than|too|very|can|could|should|may|might|must|shall|here|there|where|when|why|how|what|who|which|colour|centre|realise|organise|analyse|a|an|be|do|go|get|make|take|come|see|know|think|feel|work|play|run|walk|talk|look|find|give|say|tell|ask|help|use|try|want|need|like|love|hate|good|bad|big|small|new|old|young|beautiful|ugly|not|yes|no|my|sister|drives|car)\b/gi
            }
        };
        
        let scores = {};
        
        for (const [lang, pattern] of Object.entries(patterns)) {
            scores[lang] = 0;
            
            const charMatches = text.match(pattern.chars) || [];
            scores[lang] += charMatches.length * 3;
            
            const wordMatches = text.match(pattern.words) || [];
            scores[lang] += wordMatches.length * 2;
        }
        
        const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        
        if (scores[detectedLang] === 0) {
            return 'en-US';
        }
        
        return detectedLang;
    }

    validateLanguageMatch(text, selectedLanguage) {
        const detectedLanguage = this.detectLanguage(text);
        
        const languageMapping = {
            'de': 'de-DE',
            'de-DE': 'de-DE',
            'german': 'de-DE',
            'deutsch': 'de-DE',
            'en': 'en-US',
            'en-US': 'en-US',
            'en-GB': 'en-GB',
            'english': 'en-US',
            'fr': 'fr',
            'french': 'fr',
            'français': 'fr',
            'es': 'es',
            'spanish': 'es',
            'español': 'es',
            'nl': 'nl',
            'dutch': 'nl',
            'nederlands': 'nl'
        };
        
        const normalizedSelected = languageMapping[selectedLanguage.toLowerCase()] || selectedLanguage;
        const normalizedDetected = languageMapping[detectedLanguage.toLowerCase()] || detectedLanguage;
        
        // English variants are considered compatible
        if ((normalizedSelected === 'en-US' || normalizedSelected === 'en-GB') && 
            (normalizedDetected === 'en-US' || normalizedDetected === 'en-GB')) {
            return { isMatch: true, detectedLanguage: normalizedDetected, selectedLanguage: normalizedSelected };
        }
        
        const isMatch = normalizedDetected === normalizedSelected;
        
        return {
            isMatch,
            detectedLanguage: normalizedDetected,
            selectedLanguage: normalizedSelected,
            confidence: this.getLanguageConfidence(text, normalizedDetected)
        };
    }

    getLanguageConfidence(text, language) {
        const wordCount = text.split(/\s+/).length;
        return Math.min(wordCount / 10, 1);
    }

    showLanguageSuggestion(detectedLanguageCode, detectedLanguageName) {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.id = 'languageSuggestion';
        suggestionDiv.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            text-align: center;
        `;
        
        suggestionDiv.innerHTML = `
            <p style="margin-bottom: 15px; color: #856404; font-weight: 500;">
                💡 Would you like to change the language to ${detectedLanguageName}?
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.grammarChecker.changeLanguage('${detectedLanguageCode}')" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                ">Yes, change to ${detectedLanguageName}</button>
                <button onclick="window.grammarChecker.dismissLanguageSuggestion()" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                ">No, keep current</button>
            </div>
        `;
        
        const oldSuggestion = document.getElementById('languageSuggestion');
        if (oldSuggestion) oldSuggestion.remove();
        
        if (this.highlightedText && this.highlightedText.parentNode) {
            this.highlightedText.parentNode.appendChild(suggestionDiv);
        }
    }

    changeLanguage(languageCode) {
        if (this.languageSelect) {
            this.languageSelect.value = languageCode;
            this.showToast(`✅ Language changed successfully!`, 'success');
            this.dismissLanguageSuggestion();
            
            setTimeout(() => {
                this.checkGrammar();
            }, 500);
        }
    }

    dismissLanguageSuggestion() {
        const suggestion = document.getElementById('languageSuggestion');
        if (suggestion) {
            suggestion.remove();
        }
    }

    async checkGrammar() {
        const text = this.textInput?.value?.trim() || '';
        const language = this.languageSelect?.value || 'en-US';

        if (!text) {
            this.showError('Please enter text to check');
            return;
        }

        if (text.length > 10000) {
            this.showError('Text is too long. Please enter up to 10,000 characters');
            return;
        }

        // CHECK 1: Authentication and free usage limit
        const isAuth = this.isAuthenticated();
        if (!isAuth && freeUsageCount >= MAX_FREE_USAGE) {
            this.showUsageLimitReached();
            return;
        }

        // CHECK 2: Language validation - CHỈ KIỂM TRA NẾU TEXT ĐỦ DÀI VÀ CONFIDENCE CAO
        if (text.split(/\s+/).length >= 3) { 
            const languageValidation = this.validateLanguageMatch(text, language);
            
            // TĂNG CONFIDENCE THRESHOLD VÀ CHỈ CHẶN KHI RẤT CHẮC CHẮN
            if (!languageValidation.isMatch && languageValidation.confidence > 0.6) {
                const languageNames = {
                    'en-US': 'English (US)',
                    'en-GB': 'English (UK)', 
                    'de-DE': 'German',
                    'fr': 'French',
                    'es': 'Spanish',
                    'nl': 'Dutch'
                };
                
                const detectedName = languageNames[languageValidation.detectedLanguage] || languageValidation.detectedLanguage;
                const selectedName = languageNames[languageValidation.selectedLanguage] || languageValidation.selectedLanguage;
                
                // CHỈ CHẶN KHI CONFIDENCE RẤT CAO (> 0.6)
                if (languageValidation.confidence > 0.6) {
                    this.showError(`Language mismatch detected! Text appears to be in ${detectedName} but ${selectedName} was selected. Please select the correct language or change your text.`);
                    this.showToast(`❌ Language mismatch: Please select ${detectedName} instead of ${selectedName}`, 'error');
                    this.showLanguageSuggestion(languageValidation.detectedLanguage, detectedName);
                    
                    console.warn('Language mismatch detected - blocking grammar check:', {
                        detected: detectedName,
                        selected: selectedName,
                        confidence: languageValidation.confidence
                    });
                    
                    return; // DỪNG LẠI - KHÔNG CHECK GRAMMAR
                }
            }
        }

        this.showLoading();
        this.originalText = text;

        try {
            // Thử gọi backend API trước, nếu lỗi thì fallback sang LanguageTool trực tiếp
            let result;
            try {
                result = await this.callBackendAPI(text, language);
            } catch (backendError) {
                console.warn('Backend API failed, falling back to direct LanguageTool:', backendError);
                result = await this.callLanguageToolDirectly(text, language);
            }
            
            // Cập nhật usage count cho user chưa đăng nhập
            if (!isAuth) {
                freeUsageCount++;
                localStorage.setItem('freeUsageCount', freeUsageCount.toString());
                
                const remaining = MAX_FREE_USAGE - freeUsageCount;
                if (remaining > 0) {
                    this.showToast(`✅ Grammar check completed! ${remaining} free checks remaining.`, 'success');
                } else {
                    this.showToast(`✅ Grammar check completed! This was your last free check.`, 'info');
                }
                this.updateUsageDisplay();
            } else {
                this.showToast('✅ Grammar check completed!', 'success');
            }
            
            this.processResults(result);
        } catch (error) {
            console.error('Grammar check error:', error);
            if (error.message.includes('Free usage limit') || error.message.includes('limit reached')) {
                this.showUsageLimitReached();
            } else {
                this.showError('Unable to connect to grammar checking service. Please try again later.');
            }
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        if (this.btnText) this.btnText.classList.add('hidden');
        if (this.loading) this.loading.classList.remove('hidden');
        if (this.checkBtn) this.checkBtn.disabled = true;
    }

    hideLoading() {
        if (this.btnText) this.btnText.classList.remove('hidden');
        if (this.loading) this.loading.classList.add('hidden');
        if (this.checkBtn) this.checkBtn.disabled = false;
    }

    async callBackendAPI(text, language) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId()
        };

        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/grammar/check`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ text, language })
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            if (result.requiresAuth) {
                throw new Error('Free usage limit reached');
            }
            if (result.error && result.error.includes('Language mismatch')) {
                throw new Error(result.error);
            }
            throw new Error(result.error || 'Grammar check failed');
        }

        return result.data;
    }

    async callLanguageToolDirectly(text, language) {
        const params = new URLSearchParams({
            text: text,
            language: language,
            enabledOnly: 'false'
        });

        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const processedMatches = (data.matches || []).map(match => ({
            ...match,
            replacements: match.replacements && match.replacements.length > 0 
                ? [match.replacements[0]]
                : []
        }));

        return {
            matches: processedMatches,
            language: { name: 'Unknown' }
        };
    }

    processResults(result) {
        this.currentMatches = result.matches || [];
        if (this.errorCount) this.errorCount.textContent = this.currentMatches.length;

        if (this.currentMatches.length === 0) {
            this.showSuccess();
            if (this.suggestionsPanel) this.suggestionsPanel.classList.add('hidden');
            return;
        }

        this.highlightErrors();
        this.displaySuggestions();
    }

    highlightErrors() {
        let highlightedHTML = this.originalText;
        const matches = [...this.currentMatches].sort((a, b) => b.offset - a.offset);

        matches.forEach((match, index) => {
            const before = highlightedHTML.substring(0, match.offset);
            const error = highlightedHTML.substring(match.offset, match.offset + match.length);
            const after = highlightedHTML.substring(match.offset + match.length);

            highlightedHTML = before +
                `<span class="error-highlight" data-match-index="${index}" title="${match.message}">` +
                error +
                '</span>' +
                after;
        });

        if (this.highlightedText) {
            this.highlightedText.innerHTML = highlightedHTML.replace(/\n/g, '<br>');

            this.highlightedText.querySelectorAll('.error-highlight').forEach(span => {
                span.addEventListener('click', (e) => {
                    const matchIndex = parseInt(e.target.dataset.matchIndex);
                    this.scrollToSuggestion(matchIndex);
                });
            });
        }
    }

    displaySuggestions() {
        const suggestionsHTML = this.currentMatches.map((match, index) => {
            const errorText = this.originalText.substring(match.offset, match.offset + match.length);
            const bestReplacement = match.replacements && match.replacements.length > 0 
                ? match.replacements[0] 
                : null;

            return `
                <div class="suggestion-item" data-match-index="${index}">
                    <div class="suggestion-error">
                        <strong>❌ Error:</strong> "${errorText}"
                    </div>
                    <div class="suggestion-message">
                        <strong>Issue:</strong> ${match.message}
                    </div>
                    ${bestReplacement ? `
                        <div class="suggestion-fixes">
                            <strong>✅ Best Fix:</strong>
                            <span class="suggestion-fix best-suggestion" data-replacement="${bestReplacement.value}" data-match-index="${index}">
                                "${bestReplacement.value}"
                            </span>
                            <button class="apply-btn" data-match-index="${index}" data-replacement="${bestReplacement.value}">
                                Apply Fix
                            </button>
                        </div>
                    ` : `
                        <div class="suggestion-fixes">
                            <span class="no-suggestion">No suggestion available</span>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        if (this.suggestionsPanel) {
            this.suggestionsPanel.innerHTML = suggestionsHTML;
            this.suggestionsPanel.classList.remove('hidden');

            this.suggestionsPanel.querySelectorAll('.apply-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const matchIndex = parseInt(btn.dataset.matchIndex);
                    const replacement = btn.dataset.replacement;
                    this.applySuggestion(matchIndex, replacement);
                });
            });

            this.suggestionsPanel.querySelectorAll('.suggestion-fix').forEach(fix => {
                fix.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const matchIndex = parseInt(fix.dataset.matchIndex);
                    const replacement = fix.dataset.replacement;
                    this.applySuggestion(matchIndex, replacement);
                });
            });
        }
    }

    applySuggestion(matchIndex, replacement) {
        if (!this.currentMatches[matchIndex]) return;

        const match = this.currentMatches[matchIndex];
        const currentText = this.textInput.value;

        const before = currentText.substring(0, match.offset);
        const after = currentText.substring(match.offset + match.length);

        this.textInput.value = before + replacement + after;
        this.updateStats();

        const lengthDiff = replacement.length - match.length;
        this.currentMatches = this.currentMatches.filter((_, index) => index !== matchIndex)
            .map(m => {
                if (m.offset > match.offset) {
                    return { ...m, offset: m.offset + lengthDiff };
                }
                return m;
            });

        if (this.errorCount) this.errorCount.textContent = this.currentMatches.length;
        
        if (this.currentMatches.length === 0) {
            this.showSuccess();
            if (this.suggestionsPanel) this.suggestionsPanel.classList.add('hidden');
        } else {
            this.originalText = this.textInput.value;
            this.highlightErrors();
            this.displaySuggestions();
        }

        this.showToast('✅ Suggestion applied successfully!');
    }

    scrollToSuggestion(matchIndex) {
        if (this.suggestionsPanel) {
            const suggestionItem = this.suggestionsPanel.querySelector(`[data-match-index="${matchIndex}"]`);
            if (suggestionItem) {
                suggestionItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                suggestionItem.style.background = '#fef3c7';
                setTimeout(() => {
                    suggestionItem.style.background = '';
                }, 1000);
            }
        }
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function uploadDocument() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.docx,.pdf';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.value = event.target.result;
                    if (window.grammarChecker) {
                        window.grammarChecker.updateStats();
                    }
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
    closeUploadForm();
}

function showUploadForm() {
    const uploadForm = document.getElementById('uploadFormContainer');
    if (uploadForm) {
        uploadForm.classList.add('active');
    }
}

function closeUploadForm() {
    const uploadForm = document.getElementById('uploadFormContainer');
    if (uploadForm) {
        uploadForm.classList.remove('active');
    }
}

async function loadLanguages() {
    try {
        const data = await apiCall('/api/grammar/languages');
        const select = document.getElementById('languageSelect');
        
        if (select && data.success) {
            select.innerHTML = '';
            data.data.languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = `${lang.flag} ${lang.name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.log('Failed to load languages from API, using defaults');
        
        const select = document.getElementById('languageSelect');
        if (select && select.children.length === 0) {
            const defaultLanguages = [
                { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
                { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
                { code: 'de-DE', name: 'German', flag: '🇩🇪' },
                { code: 'es', name: 'Spanish', flag: '🇪🇸' },
                { code: 'fr', name: 'French', flag: '🇫🇷' },
                { code: 'nl', name: 'Dutch', flag: '🇳🇱' }
            ];
            
            defaultLanguages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = `${lang.flag} ${lang.name}`;
                select.appendChild(option);
            });
        }
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Make sure functions are available globally IMMEDIATELY
window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.togglePassword = togglePassword;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.uploadDocument = uploadDocument;
window.showUploadForm = showUploadForm;
window.closeUploadForm = closeUploadForm;

console.log('✅ Global functions exported:', {
    openModal: typeof window.openModal,
    closeModal: typeof window.closeModal,
    handleLogin: typeof window.handleLogin,
    handleRegister: typeof window.handleRegister
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded - Initializing Free Trial Grammar Checker...');
    
    // Test modal elements exist
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    console.log('Modal elements found:', {
        loginModal: !!loginModal,
        registerModal: !!registerModal
    });
    
    // Initialize grammar checker
    window.grammarChecker = new GrammarChecker();
    
    // Load languages
    try {
        await loadLanguages();
        console.log('✅ Languages loaded');
    } catch (error) {
        console.log('⚠️ Failed to load languages:', error.message);
    }
    
    // Add sample text button
    const controlsElement = document.querySelector('.controls');
    if (controlsElement) {
        const sampleBtn = document.createElement('button');
        sampleBtn.textContent = 'Sample Text';
        sampleBtn.className = 'check-btn';
        sampleBtn.style.background = '#6b7280';
        sampleBtn.style.marginLeft = '0.5rem';
        sampleBtn.addEventListener('click', () => {
            const sampleTexts = [
                "This is an example text with some grammar mistakes that need to be fixed.",
                "I have went to the store yesterday and buyed some groceries.",
                "She don't know how to swimming very good.",
                "Their going to they're house to get there things.",
                "Das ist ein Beispieltext mit einigen Grammatikfehlern die behoben werden müssen."
            ];
            const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.value = randomText;
                window.grammarChecker.updateStats();
            }
        });
        controlsElement.appendChild(sampleBtn);
    }
    
    // Show welcome message for new users
    const hasShownWelcome = localStorage.getItem('hasShownWelcome');
    if (!hasShownWelcome && !isAuthenticated()) {
        setTimeout(() => {
            showToast(`Welcome! You have ${MAX_FREE_USAGE} free grammar checks. Register for unlimited access!`);
            localStorage.setItem('hasShownWelcome', 'true');
        }, 1000);
    }
    
    console.log('✅ Free Trial App initialization complete');
});

// Event listeners
document.addEventListener('click', (e) => {
    // Close modal when clicking outside
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
        closeModal('loginModal');
        closeModal('registerModal');
        closeUploadForm();
        if (window.grammarChecker) {
            window.grammarChecker.dismissLanguageSuggestion();
        }
    }
});

// Debug helper
window.testModal = () => {
    console.log('🧪 Testing modal...');
    openModal('loginModal');
};

console.log('🎉 indexxx.js fully loaded and ready!');