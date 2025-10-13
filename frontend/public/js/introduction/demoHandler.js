// demoHandler.js 

import { showToast } from './utils.js';
import { 
    getRemainingUsage, 
    hasRemainingUsage, 
    incrementUsage,
    getMaxFreeUsage 
} from './usageManager.js';
import { updateTextStats, displayResults } from './grammarChecker.js';
import { showUsageLimitModal } from './uiComponents.js';
import { checkGrammar, detectLanguage } from '/js/api.js';

// Language name mapping
const LANGUAGE_NAMES = {
  'en-US': 'English (US)', 'en': 'English', 'fr': 'French', 'de': 'German', 
  'ru': 'Russian', 'ru-RU': 'Russian', 'uk': 'Ukrainian', 'uk-UA': 'Ukrainian',
  'ja': 'Japanese', 'ja-JP': 'Japanese', 
  'es': 'Spanish', 'pt': 'Portuguese', 'it': 'Italian', 'nl': 'Dutch', 
  'pl-PL': 'Polish', 'pl': 'Polish', 'sv': 'Swedish',
  'da-DK': 'Danish', 'da': 'Danish', 'ar': 'Arabic', 'zh-CN': 'Chinese', 
  'zh': 'Chinese', 'ko': 'Korean',
  'vi': 'Vietnamese', 'th': 'Thai', 'be': 'Belarusian', 'bg': 'Bulgarian', 'sr': 'Serbian'
};

const LANGUAGE_CODE_MAP = {
  'en-US': 'en', 'en': 'en', 'ja-JP': 'ja', 'ja': 'ja', 'zh-CN': 'zh', 'zh': 'zh',
  'ru-RU': 'ru', 'ru': 'ru', 'uk-UA': 'uk', 'uk': 'uk', 'de-DE': 'de', 'de': 'de',
  'fr': 'fr', 'es': 'es', 'it': 'it', 'pt': 'pt', 'vi': 'vi', 'ko': 'ko',
  'ar': 'ar', 'nl': 'nl', 'pl-PL': 'pl', 'pl': 'pl', 'sv': 'sv',
  'da-DK': 'da', 'da': 'da', 'th': 'th', 'be': 'be', 'bg': 'bg', 'sr': 'sr'
};

function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code;
}

function normalizeLanguageCode(code) {
  return LANGUAGE_CODE_MAP[code] || code;
}

export function populateDemoLanguages() {
    const demoLanguage = document.getElementById('demoLanguage');
    
    if (!demoLanguage) {
        console.warn('demoLanguage select not found');
        return;
    }
    
    demoLanguage.innerHTML = '';
    
    const languages = [
        { code: 'en-US', name: 'English (US)' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'es', name: 'Spanish' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja-JP', name: 'Japanese' },
        { code: 'zh-CN', name: 'Chinese' }
    ];
    
    languages.forEach(({ code, name }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        demoLanguage.appendChild(option);
    });
    
    demoLanguage.value = 'en-US';
    console.log('Demo languages populated');
}

// Main demo grammar check function
export async function checkDemoGrammar() {
    const demoText = document.getElementById('demoText');
    const demoLanguage = document.getElementById('demoLanguage');
    const demoResults = document.getElementById('demoResults');
    const demoErrorsList = document.getElementById('demoErrorsList');
    const demoIssueCount = document.getElementById('demoIssueCount');
    const remainingUsesEl = document.getElementById('remainingUses');
    const demoCheckBtn = document.getElementById('demoCheckBtn');
    
    if (!demoText || !demoText.value.trim()) {
        showToast('Please enter some text to check.', 'error');
        return;
    }
    
    const text = demoText.value.trim();
    const selectedLang = demoLanguage ? demoLanguage.value : 'en-US';
    
    if (!hasRemainingUsage()) {
        const maxUsage = getMaxFreeUsage();
        showToast(`Free usage limit reached (${maxUsage}/${maxUsage}). Please register or login to continue.`, 'error');
        showUsageLimitModal();
        return;
    }
    
    try {
        if (demoCheckBtn) {
            demoCheckBtn.disabled = true;
            demoCheckBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        }        
        const hiraganaPattern = /[\u3040-\u309F]/;
        const katakanaPattern = /[\u30A0-\u30FF]/;
        const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF]/;
        const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
        const cyrillicPattern = /[\u0400-\u04FF]/;
        const thaiPattern = /[\u0E00-\u0E7F]/;
        
        let preDetectedLang = null;
        if (koreanPattern.test(text)) {
            preDetectedLang = 'ko';
        } else if (thaiPattern.test(text)) {
            preDetectedLang = 'th';
        } else if (arabicPattern.test(text)) {
            preDetectedLang = 'ar';
        } else if (cyrillicPattern.test(text)) {
            preDetectedLang = 'ru-RU';
        }else if (hiraganaPattern.test(text) || katakanaPattern.test(text)) {
            preDetectedLang = 'ja-JP';
        }
        
        let detectionInfo;
        if (preDetectedLang) {
            detectionInfo = {
                language: preDetectedLang,
                confidence: 0.95,
                reliable: true,
                source: 'unicode-pattern'
            };
        } else {
            console.log('🔍 Using CLD3 detection...');
            detectionInfo = await detectLanguage(text);
        }
        
        const detectedLang = normalizeLanguageCode(detectionInfo.language);
        const selectedLangNormalized = normalizeLanguageCode(selectedLang);
        
        console.log(`Selected: ${selectedLang} (${selectedLangNormalized})`);
        console.log(`Detected: ${detectionInfo.language} (${detectedLang})`);
        console.log(`Confidence: ${(detectionInfo.confidence * 100).toFixed(1)}%`);
        
        const shouldValidate = detectionInfo.confidence > 0.3;
        const cyrillicLanguages = ['ru', 'uk', 'be', 'bg', 'sr'];
        const isCyrillicDetected = cyrillicLanguages.includes(detectedLang);
        const isCyrillicSelected = cyrillicLanguages.includes(selectedLangNormalized);
        const areBothCyrillic = isCyrillicDetected && isCyrillicSelected;
        const shouldShowWarning = shouldValidate && detectedLang !== selectedLangNormalized && !areBothCyrillic;
        
        if (shouldShowWarning) {
            if (demoCheckBtn) {
                demoCheckBtn.disabled = false;
                demoCheckBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check Grammar';
            }
            
            const detectedLangName = getLanguageName(detectionInfo.language);
            const selectedLangName = getLanguageName(selectedLang);
            
            showToast(
                `❌ Language mismatch!\n\nDetected: ${detectedLangName}\nYou selected: ${selectedLangName}\n\nPlease select the correct language.`,
                'error',
                5000
            );
            
            if (demoLanguage) {
                demoLanguage.style.border = '2px solid #dc3545';
                setTimeout(() => {
                    demoLanguage.style.border = '';
                }, 3000);
            }
            
            return;
        }
        
        console.log('✅ Language validation passed. Checking grammar...');
        
        const result = await checkGrammar(text, selectedLang);
        console.log('API result:', result);
        
        const matches = result.matches || result.data?.matches || [];
        
        if (matches || result.success !== false) {
            incrementUsage();
            const remaining = getRemainingUsage();
            
            if (remainingUsesEl) {
                remainingUsesEl.textContent = remaining;
            }
            
            if (remaining > 0) {
                showToast(`Grammar check completed! ${remaining} free checks remaining.`, 'success');
            } else {
                showToast('Grammar check completed! This was your last free check.', 'info');
            }
            
            updateTextStats(text);
            
            if (demoIssueCount) demoIssueCount.textContent = matches.length;
            
            if (demoResults) demoResults.style.display = 'block';
            if (demoErrorsList) {
                displayResults(matches, demoErrorsList);
                setupAcceptAllButton(matches);
            }
            
        } else {
            showToast('Grammar check failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Demo grammar check failed:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        if (demoCheckBtn) {
            demoCheckBtn.disabled = false;
            demoCheckBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check Grammar';
        }
    }
}

function setupAcceptAllButton(matches) {
    const acceptAllBtn = document.getElementById('demoAcceptAllBtn');
    if (!acceptAllBtn) return;
    
    const newBtn = acceptAllBtn.cloneNode(true);
    acceptAllBtn.parentNode.replaceChild(newBtn, acceptAllBtn);
    
    newBtn.addEventListener('click', () => {
        applyAllDemoSuggestions(matches);
    });
}

function applyAllDemoSuggestions(matches) {
    const demoText = document.getElementById('demoText');
    if (!demoText || !matches || matches.length === 0) return;
    
    let text = demoText.value;
    let offsetShift = 0;
    
    const sortedMatches = [...matches].sort((a, b) => a.offset - b.offset);
    
    sortedMatches.forEach(match => {
        const suggestion = match.replacements?.[0]?.value;
        if (suggestion) {
            const start = match.offset + offsetShift;
            const end = start + match.length;
            text = text.substring(0, start) + suggestion + text.substring(end);
            offsetShift += suggestion.length - match.length;
        }
    });
    
    demoText.value = text;
    
    const demoErrorsList = document.getElementById('demoErrorsList');
    if (demoErrorsList) {
        demoErrorsList.innerHTML = `
            <div class="demo-no-errors">
                <i class="fas fa-check-circle"></i>
                <p>All suggestions applied successfully!</p>
            </div>
        `;
    }
    
    const acceptAllBtn = document.getElementById('demoAcceptAllBtn');
    if (acceptAllBtn) acceptAllBtn.style.display = 'none';
    
    const issueCount = document.getElementById('demoIssueCount');
    if (issueCount) issueCount.textContent = '0';
    
    updateTextStats(text);
    showToast('All suggestions applied successfully!', 'success');
}

export function setupDemoTextListener() {
    const demoText = document.getElementById('demoText');
    if (demoText) {
        demoText.addEventListener('input', () => {
            updateTextStats(demoText.value);
        });
    }
}