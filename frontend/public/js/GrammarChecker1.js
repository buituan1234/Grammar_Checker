// GrammarChecker1.js
import { SectionManager } from './sectionManager.js';
import { checkGrammar, detectLanguage } from './api.js';
import { showCustomAlert } from './utils.js';
import { NotificationManager } from './notifications.js';

const LANGUAGE_NAMES = {
  'en-US': 'English', 'fr': 'French', 'de': 'German', 'ru': 'Russian',
  'ja': 'Japanese', 'ja-JP': 'Japanese', 'es': 'Spanish', 'pt': 'Portuguese',
  'gl-ES': 'Galician', 'de-DE': 'German (Germany)'
};

function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code;
}
let currentUser = null;

async function initializeNotifications(user) {
  if (!user || !user.userId) {
    console.warn('Cannot initialize notifications: No user data');
    return;
  }
  
  try {
    console.log('Initializing notifications for user:', user.username);
    
    // Đảm bảo chỉ có 1 instance duy nhất
    if (!window.notificationManager) {
      window.notificationManager = new NotificationManager();
      console.log('Created new NotificationManager instance');
    } else {
      console.log('Using existing NotificationManager instance');
    }
    
    // Initialize với user data
    await window.notificationManager.init(user.userId, user.userRole || 'user');
    
    console.log('Notifications initialized successfully');
    
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
function getLoggedInUser() {
  // Try new keys first
  let userData = localStorage.getItem("loggedInAs_user") || localStorage.getItem("loggedInAs_admin");
  
  // Fallback to legacy key
  if (!userData) {
    userData = localStorage.getItem("loggedInAs");
  }
  
  return userData ? JSON.parse(userData) : null;
}

  const loggedInUser = getLoggedInUser();
  const textInput = document.getElementById('textInput');
  const languageSelect = document.getElementById('languageSelect');
  const checkGrammarBtn = document.getElementById('checkGrammarBtn');
  const highlightedTextDiv = document.getElementById('highlightedText');
  const suggestionsPanel = document.getElementById('suggestionsPanel');
  const suggestionsList = document.getElementById('suggestionsList');
  const wordCountSpan = document.getElementById('wordCount');
  const charCountSpan = document.getElementById('charCount');
  const errorCountSpan = document.getElementById('errorCount');
  const successMessageDiv = document.getElementById('successMessage');
  const errorMessageDiv = document.getElementById('errorMessage');
  const acceptAllBtn = document.getElementById('acceptAllBtn');
  const statsContainer = document.getElementById('statsContainer');
  const noSuggestionsDiv = document.querySelector('.no-suggestions');

  const dropdownUsername = document.getElementById('dropdownUsername');
  const dropdownEmail = document.getElementById('dropdownEmail');

  const sectionManager = new SectionManager();
  console.log('Section Manager initialized');

  if (loggedInUser) {
    dropdownUsername.textContent = loggedInUser.username || 'Unknown';
    dropdownEmail.textContent = loggedInUser.email || 'guest@example.com';
    currentUser = loggedInUser;
    await initializeNotifications(loggedInUser);
  }

  const settingsBtn = document.getElementById('settingsToggleBtn');
  const userDropdown = document.getElementById('userDropdown');
  
  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Calculate position for fixed dropdown
    const rect = settingsBtn.getBoundingClientRect();
    const dropdown = userDropdown;
    
    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    } else {
      // Position dropdown relative to button
      dropdown.style.top = `${rect.bottom + 8}px`;
      dropdown.style.right = `${window.innerWidth - rect.right}px`;
      dropdown.classList.add('show');
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
  });
  
  // Handle window resize to reposition dropdown
  window.addEventListener('resize', () => {
    if (userDropdown.classList.contains('show')) {
      const rect = settingsBtn.getBoundingClientRect();
      userDropdown.style.top = `${rect.bottom + 8}px`;
      userDropdown.style.right = `${window.innerWidth - rect.right}px`;
    }
  });

  document.querySelector('.logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem("loggedInAs");
    localStorage.removeItem("lastGrammarMatches");
    
    // ADD THIS: Cleanup notification manager on logout
    currentUser = null;
    if (notificationManager) {
      notificationManager = null;
      window.notificationManager = null;
    }
    
    window.location.href = 'login.html?message=logout_success';
  });

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
    return 'Grammar Error'; // default
  }

  function createSuggestionItem(match, index) {
    const errorText = match.context?.text?.slice(match.context.offset, match.context.offset + match.context.length) || 'Unknown';
    const firstReplacement = match.replacements?.[0]?.value || '';
    const errorType = getErrorTypeClass(match);
    
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.innerHTML = `
      <div class="suggestion-error">${errorType}</div>
      <div class="suggestion-message">${escapeHtml(match.message)}</div>
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
      html += `<span class="grammar-error" data-error-index="${index}" title="${escapeHtml(match.message)}">${escapeHtml(errorText)}</span>`;
      lastIndex = match.offset + match.length;

      // Console logging for debugging
      const firstReplacement = match.replacements?.[0]?.value;
      const source = match.source || 'Unknown';
      console.log(`🔎 Suggestion #${index + 1}`);
      console.log(`📌 Mistake: "${errorText}"`);
      console.log(`💡 Suggest: "${firstReplacement || '[No suggestion]'}"`);
      console.log(`📖 Message: ${match.message}`);
      console.log(`🏷️ Source: ${source}`);
      console.log('-----------------------');

      // Create suggestion item with new design
      const suggestionItem = createSuggestionItem(match, index);
      suggestionsList.appendChild(suggestionItem);
    });

    html += escapeHtml(text.slice(lastIndex));
    highlightedTextDiv.innerHTML = html;

    // Add event listeners to apply buttons
    document.querySelectorAll('.suggestion-apply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.errorIndex);
        const replacement = e.target.dataset.replacement;
        applySuggestion(index, replacement);
      });
    });

    // Add event listeners to grammar errors in text
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

  // Accept All functionality
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
    
    // Remove the applied suggestion from the list
    const suggestionItem = document.querySelector(`[data-error-index="${index}"]`).closest('.suggestion-item');
    if (suggestionItem) {
      suggestionItem.style.transform = 'translateX(100%)';
      suggestionItem.style.opacity = '0';
      setTimeout(() => {
        suggestionItem.remove();
        
        // Check if there are any suggestions left
        const remainingSuggestions = suggestionsList.querySelectorAll('.suggestion-item');
        if (remainingSuggestions.length === 0) {
          showNoSuggestions();
          acceptAllBtn?.classList.add('hidden');
        }
        
        // Update error count
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
    languageSelect.innerHTML = ''; // Clear existing options
    [
      { code: 'en-US', name: 'English (US)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'ru', name: 'Russian' },
      { code: 'es', name: 'Spanish' },
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
    const lang = languageSelect.value;

    if (!text) {
      showMessage(errorMessageDiv, 'Please enter some text to check.', 'error');
      return;
    }
    
    if (!loggedInUser?.userId && getFreeUsageCount() >= 3) {
      showMessage(errorMessageDiv, '⚠️ You have used all 3 free grammar checks. Please log in to continue.', 'error');
      return showLoginModal();
    }

    showLoading(true);
    try {
      const detectedLang = await detectLanguage(text);
      if (detectedLang !== lang) {
        showMessage(errorMessageDiv, `⚠️ Detected language is "${getLanguageName(detectedLang)}", but you selected "${getLanguageName(lang)}".`, 'error');
        return;
      }

      if (!loggedInUser?.userId) incrementFreeUsageCount();

      const { matches = [] } = await checkGrammar(text);
      localStorage.setItem('lastGrammarMatches', JSON.stringify(matches));

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

  // Initialize
  populateLanguages();
  updateStats();
  // Set initial placeholder if no text
  if (!textInput.value.trim()) {
    highlightedTextDiv.innerHTML = `
      <div class="placeholder-text">
        <i class="fas fa-magic"></i>
        <p>Your corrected text will appear here.</p>
        <small>Start by entering text and clicking "Check Grammar"</small>
      </div>
    `;
  }
  /*******************************
 * Notifications Dropdown Logic
 *******************************/

// Lấy phần tử từ DOM
/*
const notificationIcon = document.querySelector(".notification-icon");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationList = document.getElementById("notificationList");
const seeAllBtn = document.getElementById("seeAllBtn");

// Toggle dropdown khi click chuông
if (notificationIcon) {
  notificationIcon.addEventListener("click", () => {
    notificationDropdown.classList.toggle("hidden");
  });
}

// Hàm thêm thông báo
function addNotification(message) {
  if (!notificationList) return;

  const li = document.createElement("li");
  li.textContent = message;

  notificationList.prepend(li);

  setTimeout(() => {
    li.remove();
  }, 3600000);
}

if (seeAllBtn) {
  seeAllBtn.addEventListener("click", () => {
    alert("Redirect to full notifications page (chưa code).");
  });
}

function onAccountTypeUpdated(newType) {
  addNotification(`Your account type has been updated to: ${newType}`);
}

setTimeout(() => {
  onAccountTypeUpdated("Premium");
}, 5000);
*/
});

