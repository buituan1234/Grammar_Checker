// usageManager.js 

const USAGE_KEY = 'freeUsageCount';
const MAX_FREE_USAGE = 3;

// Get current usage count
export function getCurrentUsage() {
    return parseInt(localStorage.getItem(USAGE_KEY) || '0');
}

// Get remaining usage count
export function getRemainingUsage() {
    return Math.max(0, MAX_FREE_USAGE - getCurrentUsage());
}

// Check if user has remaining free usage
export function hasRemainingUsage() {
    return getCurrentUsage() < MAX_FREE_USAGE;
}

// Increment usage count
export function incrementUsage() {
    const currentUsage = getCurrentUsage();
    const newUsage = currentUsage + 1;
    localStorage.setItem(USAGE_KEY, newUsage.toString());
    return newUsage;
}

// Reset usage count (for admin or testing)
export function resetUsage() {
    localStorage.removeItem(USAGE_KEY);
    return 0;
}

// Get max free usage limit
export function getMaxFreeUsage() {
    return MAX_FREE_USAGE;
}

// Update remaining uses display in UI
export function updateRemainingUsesDisplay() {
    const remainingUsesEl = document.getElementById('remainingUses');
    if (remainingUsesEl) {
        remainingUsesEl.textContent = getRemainingUsage();
    }
}