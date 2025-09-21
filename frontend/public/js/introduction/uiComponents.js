// uiComponents.js - Các component và tương tác UI

import { isLoggedIn } from './utils.js';

// Modal Functions
export function showUsageLimitModal() {
    const modal = document.getElementById('usageLimitModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

export function closeUsageLimitModal() {
    const modal = document.getElementById('usageLimitModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Smooth scrolling for navigation links
export function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize accordion functionality
export function initAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isActive = header.classList.contains('active');
            
            // Close all other accordions
            accordionHeaders.forEach(h => {
                h.classList.remove('active');
                const c = h.nextElementSibling;
                if (c) c.style.maxHeight = '0';
            });
            
            // Toggle current accordion
            if (!isActive) {
                header.classList.add('active');
                if (content) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            }
        });
    });
}

// Update button visibility based on login status
export function updateButtonVisibility() {
    const tryItFreeBtn = document.getElementById('tryItFreeBtn');
    const upgradeAccountBtn = document.getElementById('upgradeAccountBtn');
    const authButtons = document.querySelector('.auth-buttons');
    
    const loggedIn = isLoggedIn();
    
    if (tryItFreeBtn) tryItFreeBtn.style.display = loggedIn ? 'none' : 'inline-block';
    if (upgradeAccountBtn) upgradeAccountBtn.style.display = loggedIn ? 'inline-block' : 'none';
    if (authButtons) authButtons.style.display = loggedIn ? 'none' : 'flex';
}

// Add page transition effects
export function initPageTransitions() {
    const links = document.querySelectorAll('a[href]:not([href^="#"]):not([target="_blank"])');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.onclick) return; // Skip if has custom onclick
            
            e.preventDefault();
            const href = link.getAttribute('href');
            
            // Add fade out effect
            document.body.style.opacity = '0.7';
            document.body.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
}