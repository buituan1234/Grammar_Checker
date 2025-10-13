// intro-main.js - Updated Version with AuthManager

import { showToast, showCustomAlert } from './utils.js';
import { getRemainingUsage, getMaxFreeUsage } from './usageManager.js';
import { 
    initSmoothScrolling, 
    initAccordion, 
    updateButtonVisibility,
    initPageTransitions,
    showUsageLimitModal,
    closeUsageLimitModal 
} from './uiComponents.js';
import { checkDemoGrammar, populateDemoLanguages } from './demoHandler.js';
import { 
    setupSidebar, 
    updateSidebarVisibility, 
    initSidebarScrollSpy 
} from './sidebar.js';

function getAuthManager() {
    if (typeof AuthManager !== 'undefined' && AuthManager) {
        return AuthManager;
    } else if (window.AuthManager) {
        return window.AuthManager;
    } else {
        console.warn('AuthManager not available yet, using fallback');
        return {
            isLoggedIn: () => false,
            getCurrentUser: () => null,
            logout: () => false,
            getTabId: () => 'fallback-tab'
        };
    }
}

// ==================== USER AUTHENTICATION & UI ====================

function updateUIForAuth() {
    const authManager = getAuthManager();
    const authButtons = document.getElementById('authButtons');
    const userDropdownContainer = document.getElementById('userDropdownContainer');
    const desktopNav = document.getElementById('desktopNav');
    const tryItFreeBtn = document.getElementById('tryItFreeBtn');

    const loggedIn = authManager.isLoggedIn();
    updateSidebarVisibility(loggedIn);
    updateButtonVisibility(); 

    if (loggedIn) {
        const userData = authManager.getCurrentUser();
        
        if (userData) {
            if (authButtons) {
                authButtons.classList.add('hidden');
            }
            if (userDropdownContainer) {
                userDropdownContainer.classList.remove('hidden');
            }
            if (desktopNav) {
                desktopNav.classList.remove('hidden');
            }
            if (tryItFreeBtn) {
                tryItFreeBtn.style.display = 'none'; 
            }

            populateUserInfo(userData);
        }
    } else {
        if (authButtons) {
            authButtons.classList.remove('hidden');
        }
        if (desktopNav) desktopNav.classList.remove('hidden');
        if (userDropdownContainer) {
            userDropdownContainer.classList.add('hidden');
        }if (tryItFreeBtn) {
            tryItFreeBtn.style.display = 'inline-flex'; 
        }
    }
}

/**
 * Populate user information in dropdown
 */
function populateUserInfo(userData) {
    const headerUsername = document.getElementById('headerUsername');
    const dropdownUsername = document.getElementById('dropdownUsername');
    const dropdownEmail = document.getElementById('dropdownEmail');
    
    const username = userData.username || userData.name || 'User';
    const email = userData.email || 'user@example.com';
    
    if (headerUsername) headerUsername.textContent = username;
    if (dropdownUsername) dropdownUsername.textContent = username;
    if (dropdownEmail) dropdownEmail.textContent = email;
}

/**
 * Setup user dropdown functionality
 */
function setupUserDropdown() {
    const userAvatarToggle = document.getElementById('userAvatarToggle');
    const userDropdown = document.getElementById('userDropdown');
    
    if (!userAvatarToggle || !userDropdown) return;
    
    userAvatarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
        userAvatarToggle.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!userAvatarToggle.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
            userAvatarToggle.classList.remove('active');
        }
    });
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const authManager = getAuthManager();

    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (authManager.logout()) {
            showToast('Logged out successfully', 'success', 2000);
            
            setTimeout(() => {
                window.location.href = '/introduction.html';
            }, 1000);
        }
    });
}

// ==================== BUTTON HANDLERS ====================

function setupButtonHandlers() {
    const authManager = getAuthManager();
    const tryItFreeBtn = document.getElementById('tryItFreeBtn');
    const learnMoreBtn = document.getElementById('learnMoreBtn');
    const upgradeAccountBtn = document.getElementById('upgradeAccountBtn');
    const goToRegisterBtn = document.getElementById('goToRegisterBtn');
    const goToLoginBtn = document.getElementById('goToLoginBtn');

    if (tryItFreeBtn) {
        tryItFreeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (authManager.isLoggedIn()) {
                showToast('Redirecting to full grammar checker...', 'success', 1500);
                setTimeout(() => {
                    window.location.href = '/GrammarChecker1.html';
                }, 1500);
                return;
            }
            
            const remaining = getRemainingUsage();
            const maxUsage = getMaxFreeUsage();
            
            if (remaining > 0) {
                const demoSection = document.getElementById('demo');
                if (demoSection) {
                    demoSection.style.display = 'block';
                    
                    const headerHeight = document.querySelector('header')?.offsetHeight || 0;
                    const targetPosition = demoSection.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    showToast(`You have ${remaining} free checks remaining. Try it now!`, 'info', 3000);
                }
            } else {
                showToast(`You have used all free checks (${maxUsage}/${maxUsage}). Please register to continue.`, 'error', 4000);
                showUsageLimitModal();
            }
        });
    }

    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
                const headerHeight = document.querySelector('header')?.offsetHeight || 0;
                const targetPosition = aboutSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    }

    if (upgradeAccountBtn) {
        upgradeAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showCustomAlert("This feature is coming soon! Stay tuned for premium plans.", 'info');
        });
    }

    if (goToRegisterBtn) {
        goToRegisterBtn.addEventListener('click', () => {
            closeUsageLimitModal();
            window.location.href = '/index.html';
        });
    }

    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            closeUsageLimitModal();
            window.location.href = '/login.html';
        });
    }
}

// ==================== SIDEBAR NAVIGATION HANDLER ====================

function setupSidebarNavigation() {
    setTimeout(() => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        const grammarCheckLink = sidebar.querySelector('a[href="GrammarChecker1.html"]');
        const authManager = getAuthManager();
        
        if (grammarCheckLink) {
            const newLink = grammarCheckLink.cloneNode(true);
            grammarCheckLink.parentNode.replaceChild(newLink, grammarCheckLink);
            
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (authManager.isLoggedIn()) {
                    window.location.href = '/GrammarChecker1.html';
                } else {
                    showToast('Please log in to access the full grammar checker.', 'info', 4000);
                    
                    if (window.innerWidth < 1024) {
                        sidebar.classList.add('hidden');
                        const pageContentWrapper = document.getElementById('pageContentWrapper');
                        if (pageContentWrapper) {
                            pageContentWrapper.classList.remove('sidebar-open');
                        }
                    }
                }
            });
        }
    }, 100);
}

// ==================== MODAL HANDLERS ====================

function setupModalHandlers() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close') && e.target.dataset.modal === 'usageLimitModal') {
            closeUsageLimitModal();
        }
    });

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('usageLimitModal');
        if (event.target === modal) {
            closeUsageLimitModal();
        }
    });
}

// ==================== INITIALIZATION ====================

function initializeApp() {
    setupSidebar();
    setupUserDropdown();
    setupLogout();

    initSmoothScrolling();
    initAccordion();
    initPageTransitions();
    initSidebarScrollSpy();
    updateUIForAuth();
    setupButtonHandlers();
    setupSidebarNavigation();
    setupModalHandlers();
    populateDemoLanguages();

    const demoCheckBtn = document.getElementById('demoCheckBtn');
    if (demoCheckBtn) {
        demoCheckBtn.addEventListener('click', checkDemoGrammar);
    }
    setTimeout(() => {
        updateUIForAuth();
    }, 300);
}

// ==================== MAIN ====================

document.addEventListener('DOMContentLoaded', initializeApp);

window.showToast = showToast;
window.showCustomAlert = showCustomAlert;
window.closeUsageLimitModal = closeUsageLimitModal;
window.updateUIForAuth = updateUIForAuth;

window.addEventListener('load', () => {
    updateUIForAuth();
});