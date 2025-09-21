// utils.js 

// Toast notification system
export function showToast(message, type = 'success', duration = 4000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast show ${type}`;
    toast.innerHTML = `<span id="toastMessage">${message}</span>`;
    
    // Apply type-specific styling
    const colors = {
        error: '#e74c3c',
        info: '#3498db',
        success: '#27ae60'
    };
    
    toast.style.backgroundColor = colors[type] || colors.success;
    toast.style.cssText += `
        position: fixed;
        bottom: 30px;
        right: 30px;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 300px;
        text-align: center;
        visibility: visible;
        opacity: 1;
        transform: translateX(0);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
}

// Loading overlay control
export function showLoading(show = true) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Custom alert function
export function showCustomAlert(message, type = 'info', duration = 3000) {
    showToast(message, type, duration);
}

// Debounce function for performance
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if user is logged in
export function isLoggedIn() {
    return localStorage.getItem('loggedInAs') !== null;
}