// frontend/public/js/login.js

import { loginUser, logUsageActivity } from './api.js';
import { showCustomAlert, togglePassword } from './utils.js';

function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = '#ef4444'; 
        element.style.display = 'block';
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

function displaySuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = '#10b981'; 
        element.style.display = 'block';
    }
}

// Show/Hide loading state on submit button
function toggleSubmitButton(isLoading = false) {
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');
    
    if (submitBtn && btnText && btnLoading) {
        if (isLoading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            submitBtn.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const loginGeneralError = document.getElementById('loginGeneralError');
    const loginSuccess = document.getElementById('loginSuccess');

    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');

    // Setup password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            togglePassword(this.querySelector('i'));
        });
    });

    // Handle URL messages
    if (message === 'registration_success') {
        showCustomAlert("Registration successful! Please log in.", 'success');
        displaySuccess('loginSuccess', 'Registration successful! Please log in.');
        history.replaceState({}, document.title, window.location.pathname);
    } else if (message === 'login_required') {
        showCustomAlert("Please log in to access the grammar checker.", 'info');
        history.replaceState({}, document.title, window.location.pathname);
    } else if (message === 'admin_required') {
        showCustomAlert("Admin access required. Please log in as administrator.", 'warning');
        history.replaceState({}, document.title, window.location.pathname);
    }

    // Handle animation parameter
    const animateParam = urlParams.get('animate');
    if (animateParam === 'left') {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.classList.add('slide-in-left');
        }
        history.replaceState({}, document.title, window.location.pathname);
    }

    // Form validation
    function validateLoginForm() {
        let isValid = true;
        
        clearError('loginGeneralError');
        
        const username = usernameInput?.value.trim();
        const password = passwordInput?.value;
        
        if (!username) {
            displayError('loginGeneralError', 'Username is required.');
            usernameInput?.focus();
            isValid = false;
        } else if (username.length < 3) {
            displayError('loginGeneralError', 'Username must be at least 3 characters.');
            usernameInput?.focus();
            isValid = false;
        }
        
        if (!password) {
            displayError('loginGeneralError', 'Password is required.');
            if (isValid) passwordInput?.focus(); 
            isValid = false;
        } else if (password.length < 6) {
            displayError('loginGeneralError', 'Password must be at least 6 characters.');
            if (isValid) passwordInput?.focus();
            isValid = false;
        }
        
        return isValid;
    }

    // Real-time validation
    usernameInput?.addEventListener('input', () => {
        if (usernameInput.value.trim().length >= 3) {
            clearError('loginGeneralError');
        }
    });

    passwordInput?.addEventListener('input', () => {
        if (passwordInput.value.length >= 6) {
            clearError('loginGeneralError');
        }
    });

    // Check if already logged in (using original AuthManager)
    if (window.AuthManager && AuthManager.isLoggedIn()) {
        const currentUser = AuthManager.getCurrentUser();
        console.log('👤 Already logged in (Tab ID: ' + currentUser._tabId + '):', currentUser.username);
        
        // Show info and redirect
        showCustomAlert(`Already logged in as ${currentUser.username}. Redirecting...`, 'info');
        
        setTimeout(() => {
            const redirectTo = currentUser.userRole === 'admin' ? '/admin.html' : '/introduction.html';
            window.location.href = redirectTo;
        }, 1500);
        
        return; // Don't setup form if already logged in
    }

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            clearError('loginGeneralError');
            clearError('loginSuccess');

            if (!validateLoginForm()) {
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            try {
                toggleSubmitButton(true);
                
                const response = await loginUser(username, password);
                console.log("Login API response:", response);

                if (response.success && response.userId) {
                    // Prepare user data for AuthManager
                    const userToStore = {
                        userId: response.userId,
                        username: response.username,
                        email: response.email,
                        phone: response.phone,
                        userRole: response.userRole
                    };

                    // Login through AuthManager (creates session for this tab)
                    AuthManager.login(userToStore);
                    
                    // Get the tab ID that was assigned
                    const tabId = AuthManager.getTabId();
                    console.log('✅ Login successful on Tab ID:', tabId);
                    
                    // Log usage activity
                    try {
                        await logUsageActivity({
                            action: 'login',
                            language: null,
                            details: { 
                                login_method: 'username_password',
                                user_role: userToStore.userRole,
                                tab_id: tabId
                            }
                        });
                    } catch (activityError) {
                        console.warn('Failed to log activity:', activityError);
                        // Don't block login if activity logging fails
                    }

                    // Show success message
                    showCustomAlert("Login successful! Redirecting...", 'success');
                    displaySuccess('loginSuccess', 'Login successful! Redirecting...');

                    // Determine redirect destination
                    const redirectTo = urlParams.get('redirect') ||
                        (userToStore.userRole === 'admin' ? '/admin.html' : '/introduction.html');

                    // Animate out
                    setTimeout(() => {
                        const authContainer = document.querySelector('.auth-container');
                        if (authContainer) {
                            authContainer.style.transform = 'translateY(-20px)';
                            authContainer.style.opacity = '0';
                            authContainer.style.transition = 'all 0.3s ease-out';
                        }
                    }, 1000);

                    // Redirect
                    setTimeout(() => {
                        window.location.href = redirectTo;
                    }, 1500);

                } else {
                    const errorMessage = response.error || 'Login failed. Invalid credentials or missing user data from server.';
                    displayError('loginGeneralError', errorMessage);
                    showCustomAlert(errorMessage, 'error');
                }

            } catch (error) {
                console.error('Error during login API call:', error);
                const errorMsg = "Network error or server unavailable. Please try again later.";
                showCustomAlert(errorMsg, 'error');
                displayError('loginGeneralError', errorMsg);
            } finally {
                toggleSubmitButton(false);
            }
        });
    }

    // Social login handlers
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const provider = btn.classList.contains('social-btn-google') ? 'Google' : 'Facebook';
            showCustomAlert(`${provider} login is not implemented yet.`, 'info');
        });
    });

    // Form switching with animation
    const switchFormLinks = document.querySelectorAll('.switch-form-link');
    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            if (href) {
                const authContainer = document.querySelector('.auth-container');
                if (authContainer) {
                    authContainer.style.transform = 'translateX(100px)';
                    authContainer.style.opacity = '0';
                    authContainer.style.transition = 'all 0.3s ease-out';
                }
                
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.activeElement?.blur();
            clearError('loginGeneralError');
        }
        
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    });

    // Auto-focus first empty field
    setTimeout(() => {
        if (!usernameInput?.value) {
            usernameInput?.focus();
        } else if (!passwordInput?.value) {
            passwordInput?.focus();
        }
    }, 100);

    // Listen for auth events from AuthManager (Multi-Session)
    window.addEventListener('auth-login', (event) => {
        const { user, tabId } = event.detail;
        console.log('📢 Auth Event - Login:', user.username, 'Tab:', tabId);
    });

    window.addEventListener('auth-logout', (event) => {
        const { user, tabId } = event.detail;
        console.log('📢 Auth Event - Logout:', user?.username, 'Tab:', tabId);
    });

    window.addEventListener('auth-logout-all', (event) => {
        console.log('📢 Auth Event - Logout All Tabs');
    });

    // Debug: Show session info in console (development only)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔍 Debug - All Sessions:', AuthManager.getSessionsInfo());
        console.log('📊 Debug - Active Tab ID:', AuthManager.getTabId());
        
        // Show active sessions count
        const sessionsInfo = AuthManager.getSessionsInfo();
        if (sessionsInfo.length > 0) {
            console.log(`ℹ️ There are ${sessionsInfo.length} active session(s):`);
            sessionsInfo.forEach((session, index) => {
                console.log(`  ${index + 1}. ${session.username} (${session.userRole}) - ${session.isCurrent ? 'CURRENT TAB' : 'Other Tab'}`);
            });
        }
    }
});