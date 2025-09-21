// frontend/public/js/utils.js

/**
 * Displays a custom alert message on the screen.
 * @param {string} message 
 * @param {string} type 
 * @param {number} duration 
 */
export function showCustomAlert(message, type = 'info', duration = 3000) {
    // Remove any existing alerts to prevent stacking
    const existingAlert = document.getElementById('customAlert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.id = 'customAlert';
    alertDiv.textContent = message;

    // Basic styling for the alert
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.padding = '15px 30px';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.fontSize = '1.1em';
    alertDiv.style.fontWeight = 'bold';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';

    // Type-specific styling
    switch (type) {
        case 'success':
            alertDiv.style.backgroundColor = '#d4edda';
            alertDiv.style.color = '#155724';
            alertDiv.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            alertDiv.style.backgroundColor = '#f8d7da';
            alertDiv.style.color = '#721c24';
            alertDiv.style.border = '1px solid #f5c6cb';
            break;
        case 'info':
        default:
            alertDiv.style.backgroundColor = '#d1ecf1';
            alertDiv.style.color = '#0c5460';
            alertDiv.style.border = '1px solid #bee5eb';
            break;
    }

    document.body.appendChild(alertDiv);

    // Animate in
    setTimeout(() => {
        alertDiv.style.opacity = '1';
        alertDiv.style.transform = 'translateX(-50%) translateY(0)';
    }, 10); // Small delay to allow CSS transition

    // Animate out and remove
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            alertDiv.remove();
        }, 500); // Remove after transition
    }, duration);
}


/**
 * Toggles visibility of a password input field when eye icon is clicked.
 * @param {HTMLElement} iconElement - The eye icon element clicked (usually an <i> tag inside a button or span).
 */
export function togglePassword(iconElement) {
    // Tìm phần tử .password-wrapper hoặc .input-group gần nhất
    const wrapper = iconElement.closest('.password-wrapper, .input-group');
    if (!wrapper) return;

    // Tìm input trong wrapper
    const input = wrapper.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;

    // Toggle type
    const isPassword = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPassword ? 'text' : 'password');

    // Toggle icon class
    iconElement.classList.toggle('fa-eye', !isPassword);
    iconElement.classList.toggle('fa-eye-slash', isPassword);
}
