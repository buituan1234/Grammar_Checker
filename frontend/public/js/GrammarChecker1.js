// GrammarChecker1.js - Updated with new user dropdown
import { checkGrammar, detectLanguage, logUsageActivity } from './api.js'; 
import { showCustomAlert } from './utils.js';
import { NotificationManager } from './notifications.js';

const LANGUAGE_NAMES = {
  'en-US': 'English (US)', 'en': 'English', 'fr': 'French', 'de': 'German', 
  'ru': 'Russian', 'ru-RU': 'Russian', 'uk': 'Ukrainian', 'uk-UA': 'Ukrainian',
  'ja': 'Japanese', 'ja-JP': 'Japanese', 
  'es': 'Spanish', 'pt': 'Portuguese', 'gl-ES': 'Galician', 'de-DE': 'German (Germany)',
  'it': 'Italian', 'nl': 'Dutch', 'pl-PL': 'Polish', 'sv': 'Swedish',
  'da-DK': 'Danish', 'ar': 'Arabic', 'zh-CN': 'Chinese', 'ko': 'Korean',
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

// ==================== USER DROPDOWN SETUP ====================

function setupUserDropdown() {
  const userAvatarToggle = document.getElementById('userAvatarToggle');
  const userDropdown = document.getElementById('userDropdown');
  
  if (!userAvatarToggle || !userDropdown) {
    console.warn('User dropdown elements not found');
    return;
  }
  
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

function populateUserInfo(userData) {
  if (!userData) return;
  
  const headerUsername = document.getElementById('headerUsername');
  const dropdownUsername = document.getElementById('dropdownUsername');
  const dropdownEmail = document.getElementById('dropdownEmail');
  const username = userData.username || userData.name || 'User';
  const email = userData.email || 'user@example.com';
  
  if (headerUsername) headerUsername.textContent = username;
  if (dropdownUsername) dropdownUsername.textContent = username;
  if (dropdownEmail) dropdownEmail.textContent = email;
  
  console.log('User info populated:', username);
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!logoutBtn) {
        console.warn('Logout button not found');
        return;
    }
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (AuthManager.logout()) {
            showCustomAlert('Logged out successfully', 'success', 1500);
            
            setTimeout(() => {
                window.location.href = '/introduction.html';
            }, 1000);
        }
    });
}

// ==================== NOTIFICATIONS ====================

async function initializeNotifications(user) {
  if (!user || !user.userId) {
    console.warn('Cannot initialize notifications: No user data');
    return;
  }
  
  try {
    await logUsageActivity({
      action: 'page_access',
      language: null,
      details: { page: 'grammar_checker' }
    });

    console.log('Initializing notifications for user:', user.username);
    
    if (!window.notificationManager) {
      window.notificationManager = new NotificationManager();
      console.log('Created new NotificationManager instance');
    } else {
      console.log('Using existing NotificationManager instance');
    }
    
    await window.notificationManager.init(user.userId, user.userRole || 'user');
    console.log('Notifications initialized successfully');
    
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

// ==================== GRAMMAR CHECKER LOGIC ====================

document.addEventListener("DOMContentLoaded", async () => {
    if (!AuthManager.validatePageAccess()) {
        return;
    }
    
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser) {
        console.error('Failed to get user data');
        window.location.href = '/login.html?redirect=/GrammarChecker1.html';
        return;
    }

  populateUserInfo(currentUser);
  setupUserDropdown();
  setupLogout();

  // DOM Elements
  const textInput = document.getElementById('textInput');
  const languageSelect = document.getElementById('languageSelect');
  const checkGrammarBtn = document.getElementById('checkGrammarBtn');
  const highlightedTextDiv = document.getElementById('highlightedText');
  const suggestionsList = document.getElementById('suggestionsList');
  const wordCountSpan = document.getElementById('wordCount');
  const charCountSpan = document.getElementById('charCount');
  const errorCountSpan = document.getElementById('errorCount');
  const successMessageDiv = document.getElementById('successMessage');
  const errorMessageDiv = document.getElementById('errorMessage');
  const acceptAllBtn = document.getElementById('acceptAllBtn');
  const noSuggestionsDiv = document.querySelector('.no-suggestions');

  // ==================== UTILITY FUNCTIONS ====================

  function getFreeUsageCount() {
    return parseInt(localStorage.getItem("freeUsageCount") || "0");
  }

  function incrementFreeUsageCount() {
    localStorage.setItem("freeUsageCount", getFreeUsageCount() + 1);
  }

  function showLoginModal() {
    document.getElementById('loginModal')?.classList.remove('hidden');
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (match) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
  }
  
  function showMessage(el, msg, type) {
    el.textContent = msg;
    el.className = `message ${type}`;
    el.classList.remove('hidden');
    setTimeout(() => {
      el.classList.add('hidden');
    }, 5000);
  }

  function setLoading(btn, isLoading) {
    const loader = btn.querySelector('.btn-loader');
    const btnText = btn.querySelector('.btn-text');
    
    if (isLoading) {
      btn.disabled = true;
      loader?.classList.remove('hidden');
      loader?.classList.add('show');
      btnText?.classList.add('hidden');
    } else {
      btn.disabled = false;
      loader?.classList.add('hidden');
      loader?.classList.remove('show');
      btnText?.classList.remove('hidden');
    }
  }

  function setAcceptAllLoading(isLoading) {
    setLoading(acceptAllBtn, isLoading);
  }

  function showNoSuggestions() {
    suggestionsList.classList.add('hidden');
    noSuggestionsDiv.classList.remove('hidden');
  }

  function hidePlaceholder() {
    const placeholder = highlightedTextDiv.querySelector('.placeholder-text');
    if (placeholder) {
      placeholder.style.display = 'none';
    }
  }

  function showPlaceholder() {
    const placeholder = highlightedTextDiv.querySelector('.placeholder-text');
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }

  function getErrorTypeClass(match) {
    const category = match.rule?.category?.id || '';
    if (category.includes('TYPOS') || match.rule?.issueType === 'misspelling') {
      return 'Spelling Error';
    } else if (category.includes('GRAMMAR')) {
      return 'Grammar Error';
    } else if (category.includes('STYLE')) {
      return 'Style Suggestion';
    }
    return 'Grammar Error';
  }

  function createSuggestionItem(match, index) {
    const errorText = match.context?.text?.slice(match.context.offset, match.context.offset + match.context.length) || 'Unknown';
    const firstReplacement = match.replacements?.[0]?.value || '';
    const errorType = getErrorTypeClass(match);
    
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.innerHTML = `
      <div class="suggestion-header">
        <div class="suggestion-error">${errorType}</div>
      </div>
      <div class="suggestion-message">${escapeHtml(match.message_en || match.message)}</div>
      <div class="suggestion-actions">
        ${firstReplacement ? `<span class="suggestion-fix">${escapeHtml(errorText)} → ${escapeHtml(firstReplacement)}</span>` : '<em>No suggestions available</em>'}
        ${firstReplacement ? `<button class="suggestion-apply-btn" data-error-index="${index}" data-replacement="${escapeHtml(firstReplacement)}">Apply</button>` : ''}
      </div>
    `;
    
    return li;
  }

  function displayResults(text, matches) {
    hidePlaceholder();
    
    let html = '', lastIndex = 0;
    suggestionsList.innerHTML = '';
    suggestionsList.classList.remove('hidden');
    noSuggestionsDiv.classList.add('hidden');
    
    matches.sort((a, b) => a.offset - b.offset);

    matches.forEach((match, index) => {
      html += escapeHtml(text.slice(lastIndex, match.offset));
      const errorText = text.slice(match.offset, match.offset + match.length);
      html += `<span class="grammar-error" data-error-index="${index}" title="${escapeHtml(match.message_en || match.message)}">${escapeHtml(errorText)}</span>`;
      lastIndex = match.offset + match.length;

      const suggestionItem = createSuggestionItem(match, index);
      suggestionsList.appendChild(suggestionItem);
    });

    html += escapeHtml(text.slice(lastIndex));
    highlightedTextDiv.innerHTML = html;

    document.querySelectorAll('.suggestion-apply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.errorIndex);
        const replacement = e.target.dataset.replacement;
        applySuggestion(index, replacement);
      });
    });

    document.querySelectorAll('.grammar-error').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.errorIndex);
        const suggestionItem = document.querySelector(`[data-error-index="${index}"]`).closest('.suggestion-item');
        if (suggestionItem) {
          suggestionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          suggestionItem.style.backgroundColor = 'var(--primary-50)';
          setTimeout(() => {
            suggestionItem.style.backgroundColor = '';
          }, 2000);
        }
      });
    });

    acceptAllBtn?.classList.remove('hidden');
  }

  acceptAllBtn?.addEventListener('click', () => {
    const matches = JSON.parse(localStorage.getItem('lastGrammarMatches') || '[]');
    if (!matches.length) return;

    let updatedText = textInput.value;
    let offsetShift = 0;
    setAcceptAllLoading(true);

    matches.forEach(match => {
      const replacement = match.replacements?.[0]?.value;
      if (replacement) {
        const start = match.offset + offsetShift;
        const end = start + match.length;
        updatedText = updatedText.slice(0, start) + replacement + updatedText.slice(end);
        offsetShift += replacement.length - match.length;
      }
    });

    setTimeout(() => {
      textInput.value = updatedText;
      highlightedTextDiv.textContent = updatedText;
      showNoSuggestions();
      errorCountSpan.textContent = '0';
      acceptAllBtn.classList.add('hidden');
      setAcceptAllLoading(false);
      showCustomAlert('All suggestions applied!', 'success');
      hidePlaceholder();
    }, 300);
  });

  function applySuggestion(index, replacement) {
    const text = textInput.value;
    const matches = JSON.parse(localStorage.getItem('lastGrammarMatches') || '[]');
    const match = matches[index];
    
    if (!match) return;
    
    const newText = text.slice(0, match.offset) + replacement + text.slice(match.offset + match.length);
    textInput.value = newText;
    highlightedTextDiv.textContent = newText;
    
    const suggestionItem = document.querySelector(`[data-error-index="${index}"]`).closest('.suggestion-item');
    if (suggestionItem) {
      suggestionItem.style.transform = 'translateX(100%)';
      suggestionItem.style.opacity = '0';
      setTimeout(() => {
        suggestionItem.remove();
        
        const remainingSuggestions = suggestionsList.querySelectorAll('.suggestion-item');
        if (remainingSuggestions.length === 0) {
          showNoSuggestions();
          acceptAllBtn?.classList.add('hidden');
        }
        
        errorCountSpan.textContent = remainingSuggestions.length;
      }, 300);
    }
    
    hidePlaceholder();
    showCustomAlert("Suggestion applied!", 'success');
  }

  function showLoading(isLoading) {
    setLoading(checkGrammarBtn, isLoading);
  }

  function hideMessages() {
    successMessageDiv.classList.add('hidden');
    errorMessageDiv.classList.add('hidden');
  }

  function updateStats() {
    const text = textInput.value;
    charCountSpan.textContent = text.length;
    wordCountSpan.textContent = (text.match(/\b\w+\b/g) || []).length;
  }

  function populateLanguages() {
    languageSelect.innerHTML = '';
    [
      { code: 'en-US', name: 'English (US)' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'es', name: 'Spanish' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'zh-CN', name: 'Chinese' }
    ].forEach(({ code, name }) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      languageSelect.appendChild(opt);
    });
    languageSelect.value = 'en-US'; 
  }

  checkGrammarBtn?.addEventListener('click', async () => {
    hideMessages();
    const text = textInput.value.trim();
    const selectedLang = languageSelect.value;

    if (!text) {
      showMessage(errorMessageDiv, 'Please enter some text to check.', 'error');
      return;
    }
    
    if (!currentUser?.userId && getFreeUsageCount() >= 3) {
      showMessage(errorMessageDiv, 'You have used all 3 free grammar checks. Please log in to continue.', 'error');
      return showLoginModal();
    }

    showLoading(true);
    
    try {
      const hiraganaPattern = /[\u3040-\u309F]/;
      const katakanaPattern = /[\u30A0-\u30FF]/;
      const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF]/; 
      const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/; 
      const cyrillicPattern = /[\u0400-\u04FF]/; 
      const thaiPattern = /[\u0E00-\u0E7F]/; 
  
  let preDetectedLang = null;
  
    // ✅ Japanese: CHỈ khi có Hiragana HOẶC Katakana
    if (hiraganaPattern.test(text) || katakanaPattern.test(text)) {
      preDetectedLang = 'ja-JP';
      console.log('Pre-detected Japanese by Hiragana/Katakana');
    } else if (koreanPattern.test(text)) {
      preDetectedLang = 'ko';
      console.log('Pre-detected Korean by Hangul');
    } else if (thaiPattern.test(text)) {
      preDetectedLang = 'th';
      console.log('Pre-detected Thai by Unicode range');
    } else if (arabicPattern.test(text)) {
      preDetectedLang = 'ar';
      console.log('Pre-detected Arabic by Unicode range');
    } else if (cyrillicPattern.test(text)) {
      preDetectedLang = 'ru-RU';
      console.log('Pre-detected Cyrillic (Russian) by Unicode range');
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
        console.log('Detecting language with CLD3...');
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
      
      console.log('Validation check:', {
        shouldValidate,
        languageMatch: detectedLang === selectedLangNormalized,
        areBothCyrillic,
        shouldShowWarning
      });
      
      if (shouldShowWarning) {
        showLoading(false);
        
        const detectedLangName = getLanguageName(detectionInfo.language);
        const selectedLangName = getLanguageName(selectedLang);
        
        showMessage(
          errorMessageDiv, 
          `Language mismatch! Text language is "${detectedLangName}" but you selected "${selectedLangName}". Please select the correct language.`,
          'error'
        );
        
        languageSelect.style.border = '2px solid #dc3545';
        setTimeout(() => {
          languageSelect.style.border = '';
        }, 3000);
        
        showCustomAlert(
          `Detected language: ${detectedLangName}\nYou selected: ${selectedLangName}\n\nPlease change your language selection.`,
          'error'
        );
        
        return;
      }
      
      if (!currentUser?.userId) incrementFreeUsageCount();

      console.log(`Language validation passed. Checking grammar...`);
      const result = await checkGrammar(text, selectedLang);
      const matches = result.matches || [];
      
      localStorage.setItem('lastGrammarMatches', JSON.stringify(matches));

      if (currentUser?.userId) {
        await logUsageActivity({
          action: 'grammar_check',
          language: selectedLang,
          details: {
            text_length: text.length,
            errors_found: matches.length,
            detected_language: detectionInfo.language,
            detection_confidence: detectionInfo.confidence,
            language_match: detectedLang === selectedLangNormalized,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (!matches.length) {
        highlightedTextDiv.textContent = text;
        showNoSuggestions();
        acceptAllBtn?.classList.add('hidden');
        hidePlaceholder();
        showMessage(successMessageDiv, 'No grammar errors found! Your text looks great.', 'success');
      } else {
        displayResults(text, matches);
        showMessage(successMessageDiv, `Found ${matches.length} grammar issue${matches.length === 1 ? '' : 's'} to review.`, 'success');
      }

      errorCountSpan.textContent = matches.length;
      
    } catch (err) {
      console.error('Error checking grammar:', err);
      showMessage(errorMessageDiv, 'Grammar check failed. Please try again.', 'error');
    } finally {
      showLoading(false);
      updateStats();
    }
  });

  textInput.addEventListener('input', () => {
    const text = textInput.value.trim();
    updateStats();
    hideMessages();
    
    if (text) {
      highlightedTextDiv.textContent = text;
      hidePlaceholder();
    } else {
      highlightedTextDiv.innerHTML = `
        <div class="placeholder-text">
          <i class="fas fa-magic"></i>
          <p>Your corrected text will appear here.</p>
          <small>Start by entering text and clicking "Check Grammar"</small>
        </div>
      `;
    }
    
    errorCountSpan.textContent = '0';
    suggestionsList.innerHTML = '';
    suggestionsList.classList.add('hidden');
    noSuggestionsDiv.classList.add('hidden');
    acceptAllBtn?.classList.add('hidden');
  });

  populateLanguages();
  updateStats();
  
  if (!textInput.value.trim()) {
    highlightedTextDiv.innerHTML = `
      <div class="placeholder-text">
        <i class="fas fa-magic"></i>
        <p>Your corrected text will appear here.</p>
        <small>Start by entering text and clicking "Check Grammar"</small>
      </div>
    `;
  }
  
  console.log('Grammar Checker fully initialized');
});