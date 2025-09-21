// frontend/public/js/login.js

import { loginUser } from './api.js'; 
import { showCustomAlert, togglePassword } from './utils.js';

function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = '#ef4444'; // Use CSS variable color
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
        element.style.color = '#10b981'; // Use CSS variable color
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

    // 👁️ Enhanced toggle password functionality
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Find the password input (previous sibling)
            const passwordWrapper = this.closest('.password-wrapper');
            const passwordInput = passwordWrapper?.querySelector('input[type="password"], input[type="text"]');
            const icon = this.querySelector('i');
            
            if (passwordInput && icon) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    this.setAttribute('aria-label', 'Hide password');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    this.setAttribute('aria-label', 'Show password');
                }
            }
        });
    });

    // Show message if exists in URL params
    if (message === 'registration_success') {
        showCustomAlert("Registration successful! Please log in.", 'success');
        displaySuccess('loginSuccess', 'Registration successful! Please log in.');
        history.replaceState({}, document.title, window.location.pathname);
    } else if (message === 'login_required') {
        showCustomAlert("Please log in to access the grammar checker.", 'info');
        history.replaceState({}, document.title, window.location.pathname);
    }

    // Enhanced animation for page transition
    const animateParam = urlParams.get('animate');
    if (animateParam === 'left') {
        // Updated to use new container class
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.classList.add('slide-in-left');
        }
        history.replaceState({}, document.title, window.location.pathname);
    }

    // Enhanced form validation
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
            if (isValid) passwordInput?.focus(); // Only focus if no previous errors
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

    // Enhanced form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Clear previous messages
            clearError('loginGeneralError');
            clearError('loginSuccess');

            // Validate form
            if (!validateLoginForm()) {
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            try {
                // Show loading state
                toggleSubmitButton(true);
                
                const response = await loginUser(username, password);
                console.log("Login API response:", response);

                if (response.success && response.userId) {
                    const userToStore = {
                        userId: response.userId,
                        username: response.username,
                        email: response.email,
                        phone: response.phone,
                        userRole: response.userRole
                    };

                    // Store user data
                    const storageKey = userToStore.userRole === 'admin' ? 'loggedInAs_admin' : 'loggedInAs_user';
                    localStorage.setItem(storageKey, JSON.stringify(userToStore));

                    // Show success message
                    showCustomAlert("Login successful! Redirecting...", 'success');
                    displaySuccess('loginSuccess', 'Login successful! Redirecting...');

                    // Determine redirect URL
                    const redirectTo = urlParams.get('redirect') ||
                        (userToStore.userRole === 'admin' ? '/admin.html' : '/GrammarChecker1.html');

                    // Add exit animation
                    setTimeout(() => {
                        const authContainer = document.querySelector('.auth-container');
                        if (authContainer) {
                            authContainer.style.transform = 'translateY(-20px)';
                            authContainer.style.opacity = '0';
                            authContainer.style.transition = 'all 0.3s ease-out';
                        }
                    }, 1000);

                    // Redirect after animation
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
                // Hide loading state
                toggleSubmitButton(false);
            }
        });
    }

    // Enhanced social login buttons (if they exist)
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const provider = btn.classList.contains('social-btn-google') ? 'Google' : 'Facebook';
            showCustomAlert(`${provider} login is not implemented yet.`, 'info');
        });
    });

    // Enhanced page transition effects
    const switchFormLinks = document.querySelectorAll('.switch-form-link');
    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            if (href) {
                // Add exit animation
                const authContainer = document.querySelector('.auth-container');
                if (authContainer) {
                    authContainer.style.transform = 'translateX(100px)';
                    authContainer.style.opacity = '0';
                    authContainer.style.transition = 'all 0.3s ease-out';
                }
                
                // Navigate after animation
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });
    
    // Enhanced keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Clear any active states
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

    // Auto-focus first empty input
    setTimeout(() => {
        if (!usernameInput?.value) {
            usernameInput?.focus();
        } else if (!passwordInput?.value) {
            passwordInput?.focus();
        }
    }, 100);
});