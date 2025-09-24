// main.js - File chính được tối ưu hóa

import { showToast, showCustomAlert, isLoggedIn } from './utils.js';
import { getRemainingUsage, getMaxFreeUsage } from './usageManager.js';
import { 
    initSmoothScrolling, 
    initAccordion, 
    updateButtonVisibility,
    initPageTransitions,
    showUsageLimitModal,
    closeUsageLimitModal 
} from './uiComponents.js';
import { checkDemoGrammar } from './demoHandler.js';

// Event handlers for buttons
function setupButtonHandlers() {
    const tryItFreeBtn = document.getElementById('tryItFreeBtn');
    const learnMoreBtn = document.getElementById('learnMoreBtn');
    const checkGrammarNav = document.getElementById('checkGrammarNav');
    const upgradeAccountBtn = document.getElementById('upgradeAccountBtn');
    const goToRegisterBtn = document.getElementById('goToRegisterBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Try it Free Button
    if (tryItFreeBtn) {
        tryItFreeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const remaining = getRemainingUsage();
            const maxUsage = getMaxFreeUsage();
            
            if (remaining > 0) {
                showToast(`You have ${remaining} free uses left. Redirecting to grammar checker...`, 'info', 2000);
                setTimeout(() => {
                    window.location.href = '/GrammarChecker1.html';
                }, 2000);
            } else {
                showToast(`You have run out of uses (${maxUsage}/${maxUsage}), you need to register an account.`, 'error', 5000);
                showUsageLimitModal();
            }
        });
    }

    // Learn More Button - scroll to about section
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

    // Check Grammar Navigation
    if (checkGrammarNav) {
        checkGrammarNav.addEventListener('click', (e) => {
            e.preventDefault();
            if (isLoggedIn()) {
                window.location.href = '/GrammarChecker1.html';
            } else {
                showCustomAlert("Please log in to access the full grammar checker.", 'info', 3000);
                setTimeout(() => {
                    window.location.href = '/login.html?redirect=/GrammarChecker1.html&message=login_required';
                }, 1500);
            }
        });
    }

    // Upgrade Button
    if (upgradeAccountBtn) {
        upgradeAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showCustomAlert("This feature is coming soon! Stay tuned for premium plans.", 'info');
        });
    }

    // Modal handlers
    if (goToRegisterBtn) {
        goToRegisterBtn.addEventListener('click', () => {
            closeUsageLimitModal();
            window.location.href = '/index.html';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeUsageLimitModal);
    }
}

// Setup modal event listeners
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

// Main initialization function
function initializeApp() {
    console.log('🚀 Initializing Enhanced AI Grammar Editor...');
    
    initSmoothScrolling();
    initAccordion();
    updateButtonVisibility();
    initPageTransitions();
    
    setupButtonHandlers();
    setupModalHandlers();
    
    const demoCheckBtn = document.getElementById('demoCheckBtn');
    if (demoCheckBtn) {
        demoCheckBtn.addEventListener('click', checkDemoGrammar);
    }
    
    console.log('✅ Enhanced AI Grammar Editor initialization complete');
}

// Main DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', initializeApp);

window.showToast = showToast;
window.showCustomAlert = showCustomAlert;
window.closeUsageLimitModal = closeUsageLimitModal;