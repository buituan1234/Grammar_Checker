// utils.js 

// Toast notification system
export function showToast(message, type = 'success', duration = 5000) {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    const hideTimeout = setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
    
    toast.addEventListener('click', () => {
        clearTimeout(hideTimeout);
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });
}

export function showLoading(show = true) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

export function showCustomAlert(message, type = 'info', duration = 3000) {
    showToast(message, type, duration);
}

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
    return !!(
        localStorage.getItem('loggedInAs_user') ||
        localStorage.getItem('loggedInAs_admin') 
    );
}