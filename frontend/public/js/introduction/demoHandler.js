// demoHandler.js - Xử lý demo kiểm tra ngữ pháp

import { showToast } from './utils.js';
import { validateLanguageMatch, LANGUAGE_NAMES } from './languageUtils.js';
import { 
    getCurrentUsage, 
    getRemainingUsage, 
    hasRemainingUsage, 
    incrementUsage,
    getMaxFreeUsage 
} from './usageManager.js';
import { 
    performDemoGrammarCheck, 
    updateTextStats, 
    displayResults 
} from './grammarChecker.js';
import { showUsageLimitModal } from './uiComponents.js';

// Main demo grammar check function
export async function checkDemoGrammar() {
    const demoText = document.getElementById('demoText');
    const demoLanguage = document.getElementById('demoLanguage');
    const demoResults = document.getElementById('demoResults');
    const demoErrorsList = document.getElementById('demoErrorsList');
    const demoIssueCount = document.getElementById('demoIssueCount');
    const remainingUsesEl = document.getElementById('remainingUses');
    const demoCheckBtn = document.getElementById('demoCheckBtn');
    
    // Validate input
    if (!demoText || !demoText.value.trim()) {
        showToast('⚠️ Please enter some text to check.', 'error');
        return;
    }
    
    const text = demoText.value.trim();
    const language = demoLanguage ? demoLanguage.value : 'en-US';
    
    // Check usage limits
    if (!hasRemainingUsage()) {
        const maxUsage = getMaxFreeUsage();
        showToast(`⚠️ Free usage limit reached (${maxUsage}/${maxUsage}). Please register or login to continue.`, 'error');
        showUsageLimitModal();
        return;
    }
    
    // Language validation
    if (!validateLanguageMatch(text, language)) {
        const detectedLang = detectLanguage(text);
        showToast(
            `⚠️ Language mismatch: Text appears to be ${LANGUAGE_NAMES[detectedLang] || 'unknown'} but ${LANGUAGE_NAMES[language]} is selected.`, 
            'error'
        );
        return;
    }
    
    try {
        // Show loading state
        if (demoCheckBtn) {
            demoCheckBtn.disabled = true;
            demoCheckBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        }
        
        // Perform grammar check
        const result = await performDemoGrammarCheck(text, language);
        
        if (result.success) {
            // Update usage count
            incrementUsage();
            
            const remaining = getRemainingUsage();
            if (remainingUsesEl) {
                remainingUsesEl.textContent = remaining;
            }
            
            // Show success message
            if (remaining > 0) {
                showToast(`✅ Grammar check completed! ${remaining} free checks remaining.`, 'success');
            } else {
                showToast('✅ Grammar check completed! This was your last free check.', 'info');
            }
            
            // Update stats
            updateTextStats(text);
            
            const matches = result.data.matches;
            if (demoIssueCount) demoIssueCount.textContent = matches.length;
            
            // Display results
            if (demoResults) demoResults.style.display = 'block';
            if (demoErrorsList) {
                displayResults(matches, demoErrorsList);
            }
            
        } else {
            showToast('❌ Grammar check failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Demo grammar check failed:', error);
        showToast('❌ Error: ' + error.message, 'error');
    } finally {
        // Reset button state
        if (demoCheckBtn) {
            demoCheckBtn.disabled = false;
            demoCheckBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check Grammar';
        }
    }
}