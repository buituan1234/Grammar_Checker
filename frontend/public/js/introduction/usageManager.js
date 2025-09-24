// usageManager.js 

const USAGE_KEY = 'freeUsageCount';
const MAX_FREE_USAGE = 3;

// Get current usage count
export function getCurrentUsage() {
    return parseInt(localStorage.getItem(USAGE_KEY) || '0');
}

export function getRemainingUsage() {
    return Math.max(0, MAX_FREE_USAGE - getCurrentUsage());
}

export function hasRemainingUsage() {
    return getCurrentUsage() < MAX_FREE_USAGE;
}

export function incrementUsage() {
    const currentUsage = getCurrentUsage();
    const newUsage = currentUsage + 1;
    localStorage.setItem(USAGE_KEY, newUsage.toString());
    return newUsage;
}

export function resetUsage() {
    localStorage.removeItem(USAGE_KEY);
    return 0;
}

export function getMaxFreeUsage() {
    return MAX_FREE_USAGE;
}

export function updateRemainingUsesDisplay() {
    const remainingUsesEl = document.getElementById('remainingUses');
    if (remainingUsesEl) {
        remainingUsesEl.textContent = getRemainingUsage();
    }
}