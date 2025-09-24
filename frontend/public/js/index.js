// frontend/public/js/index.js

import { registerUser } from './api.js'; 
import { showCustomAlert, togglePassword } from './utils.js';

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const fullNameInput = document.getElementById("fullName");

    const usernameError = document.getElementById("usernameError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const phoneError = document.getElementById("phoneError");
    const emailError = document.getElementById("emailError");
    const fullNameError = document.getElementById("fullNameError");
    const registerSuccess = document.getElementById("registerSuccess");
    const registerGeneralError = document.getElementById("registerGeneralError");

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

    // Enhanced error display with styling
    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.color = '#ef4444';
            element.style.display = 'block';
        }
    }

    function clearError(element) {
        if (element) {
            element.textContent = "";
            element.style.display = 'none';
        }
    }

    function displaySuccess(element, message) {
        if (element) {
            element.textContent = message;
            element.style.color = '#10b981';
            element.style.display = 'block';
        }
    }

    function clearMessages() {
        clearError(usernameError);
        clearError(passwordError);
        clearError(confirmPasswordError);
        clearError(phoneError);
        clearError(emailError);
        clearError(fullNameError);
        clearError(registerSuccess);
        clearError(registerGeneralError);
    }

    function validateForm() {
        let isValid = true;
        let firstErrorField = null;
        
        clearMessages();

        // ✅ ADDED: Full Name validation
        if (fullNameInput.value.trim().length < 2) {
            displayError(fullNameError, "Full name must be at least 2 characters.");
            if (!firstErrorField) firstErrorField = fullNameInput;
            isValid = false;
        }

        // Username validation
        if (usernameInput.value.trim().length < 3) {
            displayError(usernameError, "Username must be at least 3 characters.");
            if (!firstErrorField) firstErrorField = usernameInput;
            isValid = false;
        }

        // Password validation
        if (passwordInput.value.length < 6) {
            displayError(passwordError, "Password must be at least 6 characters.");
            if (!firstErrorField) firstErrorField = passwordInput;
            isValid = false;
        }

        // Confirm password validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            displayError(confirmPasswordError, "Passwords do not match.");
            if (!firstErrorField) firstErrorField = confirmPasswordInput;
            isValid = false;
        }

        // Email validation (enhanced)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            displayError(emailError, "Please enter a valid email address.");
            if (!firstErrorField) firstErrorField = emailInput;
            isValid = false;
        }

        // Phone validation (optional but if provided must be valid)
        if (phoneInput.value.trim() !== "") {
            const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(phoneInput.value.trim())) {
                displayError(phoneError, "Please enter a valid phone number.");
                if (!firstErrorField) firstErrorField = phoneInput;
                isValid = false;
            }
        }

        if (firstErrorField) {
            firstErrorField.focus();
        }

        return isValid;
    }

    // Enhanced real-time validation
    fullNameInput?.addEventListener('input', () => {
        if (fullNameInput.value.trim().length >= 2) {
            clearError(fullNameError);
        }
    });

    usernameInput?.addEventListener('input', () => {
        if (usernameInput.value.trim().length >= 3) {
            clearError(usernameError);
        }
    });

    passwordInput?.addEventListener('input', () => {
        if (passwordInput.value.length >= 6) {
            clearError(passwordError);
        }
        if (confirmPasswordInput.value && passwordInput.value === confirmPasswordInput.value) {
            clearError(confirmPasswordError);
        }
    });

    confirmPasswordInput?.addEventListener('input', () => {
        if (passwordInput.value === confirmPasswordInput.value) {
            clearError(confirmPasswordError);
        }
    });

    emailInput?.addEventListener('input', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(emailInput.value.trim())) {
            clearError(emailError);
        }
    });

    phoneInput?.addEventListener('input', () => {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        if (phoneInput.value.trim() === "" || phoneRegex.test(phoneInput.value.trim())) {
            clearError(phoneError);
        }
    });

    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            togglePassword(this.querySelector('i')); 
        });
    });

    registerForm?.addEventListener("submit", async function(e) {
        e.preventDefault();
        clearMessages();

        if (validateForm()) {
            const fullName = fullNameInput.value.trim();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();

            try {
                toggleSubmitButton(true);

                const data = await registerUser({ fullName, username, password, email, phone });

                if (data.success) {
                    showCustomAlert("Registration successful! Redirecting to login...", 'success');
                    displaySuccess(registerSuccess, "Registration successful! Redirecting to login...");

                    const params = new URLSearchParams(window.location.search);
                    const redirectTo = params.get('redirect');

                    setTimeout(() => {
                        const authContainer = document.querySelector('.auth-container');
                        if (authContainer) {
                            authContainer.style.transform = 'translateY(-20px)';
                            authContainer.style.opacity = '0';
                            authContainer.style.transition = 'all 0.3s ease-out';
                        }
                    }, 1000);

                    setTimeout(() => {
                        if (redirectTo) {
                            window.location.href = redirectTo;
                        } else {
                            window.location.href = "login.html?message=registration_success";
                        }
                    }, 1500);
                } else {
                    const errorMessage = data.error || "Registration failed. Please try again.";
                    showCustomAlert(errorMessage, 'error');
                    displayError(registerGeneralError, errorMessage);
                }
            } catch (error) {
                console.error('Error during registration API call:', error);
                const errorMsg = "Network error or server unavailable. Please try again later.";
                showCustomAlert(errorMsg, 'error');
                displayError(registerGeneralError, errorMsg);
            } finally {
                toggleSubmitButton(false);
            }
        } else {
            displayError(registerGeneralError, "Please correct the errors above.");
        }
    });

    const animationParams = new URLSearchParams(window.location.search);
    if (animationParams.get("animate") === "right") {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.classList.add("slide-in-right");
        }
    }

    const switchFormLinks = document.querySelectorAll('.switch-form-link');
    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            if (href) {
                const authContainer = document.querySelector('.auth-container');
                if (authContainer) {
                    authContainer.style.transform = 'translateX(-100px)';
                    authContainer.style.opacity = '0';
                    authContainer.style.transition = 'all 0.3s ease-out';
                }
                
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });

    // Enhanced back arrow functionality
    const backArrowBtn = document.querySelector('.back-arrow-btn');
    if (backArrowBtn) {
        backArrowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const authContainer = document.querySelector('.auth-container');
            if (authContainer) {
                authContainer.style.transform = 'scale(0.95)';
                authContainer.style.opacity = '0';
                authContainer.style.transition = 'all 0.3s ease-out';
            }
            
            setTimeout(() => {
                window.location.href = backArrowBtn.href;
            }, 300);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.activeElement?.blur();
            clearMessages();
        }
        
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    });

    setTimeout(() => {
        if (!fullNameInput?.value) {
            fullNameInput?.focus();
        } else if (!usernameInput?.value) {
            usernameInput?.focus();
        } else if (!passwordInput?.value) {
            passwordInput?.focus();
        } else if (!confirmPasswordInput?.value) {
            confirmPasswordInput?.focus();
        } else if (!emailInput?.value) {
            emailInput?.focus();
        }
    }, 100);

    function resetForm() {
        registerForm?.reset();
        clearMessages();
        fullNameInput?.focus(); 
    }

    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetForm();
        });
    }

    // Password strength indicator (optional enhancement)
    passwordInput?.addEventListener('input', () => {
        const password = passwordInput.value;
        const strengthIndicator = document.querySelector('.password-strength');
        
        if (strengthIndicator) {
            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.match(/[a-z]/)) strength++;
            if (password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++;
            
            strengthIndicator.className = `password-strength strength-${strength}`;
            
            const strengthTexts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
            strengthIndicator.textContent = strengthTexts[strength] || '';
        }
    });
});