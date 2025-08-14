// Updated introduction.js with proper role-based navigation
// Free usage tracking
let freeUsageCount = parseInt(localStorage.getItem('freeUsageCount') || '0');
const MAX_FREE_USAGE = 3;

// API Base URL
const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') 
  ? 'http://localhost:3000' 
  : window.location.origin;

console.log('API Base URL:', API_BASE_URL);

// Generate or get session ID
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

// Check authentication status
function isAuthenticated() {
  const token = localStorage.getItem('authToken');
  return token !== null && token !== 'null' && token !== '';
}

// Check if user is admin
function isAdmin() {
  const userData = localStorage.getItem('userData');
  if (userData) {
    const user = JSON.parse(userData);
    return user.isAdmin === true || user.IsAdmin === true;
  }
  return false;
}

// API call helper
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Session-ID': getSessionId(),
    ...options.headers
  };

  const authToken = localStorage.getItem('authToken');
  if (authToken && authToken !== 'null') {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method: 'GET',
    headers,
    ...options
  };

  try {
    console.log('Making API call:', { url, method: config.method });
    
    const response = await fetch(url, config);
    const data = await response.json();

    console.log('API response:', { status: response.status, data });

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to server. Please make sure the server is running on http://localhost:3000');
    }
    
    throw error;
  }
}

// Language detection and validation (same as before)
function detectLanguage(text) {
  const patterns = {
    'de-DE': /[äöüßÄÖÜ]|ich|der|die|das|und|ist|sind/gi,
    'fr': /[àâäéèêëïîôöùûüÿç]|je|le|la|les|et|est|sont/gi,
    'es': /[ñáéíóúü]|el|la|los|las|y|es|son/gi,
    'nl': /ij|zij|wij|de|het|en|is|zijn/gi
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  return 'en-US';
}

function validateLanguageMatch(text, selectedLanguage) {
  const detectedLanguage = detectLanguage(text);
  
  if ((selectedLanguage === 'en-US' || selectedLanguage === 'en-GB') && 
      (detectedLanguage === 'en-US' || detectedLanguage === 'en-GB')) {
    return true;
  }
  
  return detectedLanguage === selectedLanguage;
}

// Modal handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.classList.remove('slide-left', 'slide-right');
      if (modalId === 'registerModal') {
        modalContent.classList.add('slide-left');
      } else if (modalId === 'loginModal') {
        modalContent.classList.add('slide-right');
      }
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    
    // Clear form data and errors
    if (modalId === 'loginModal') {
      const loginForm = document.getElementById('loginForm');
      const loginError = document.getElementById('loginError');
      if (loginForm) loginForm.reset();
      if (loginError) loginError.textContent = '';
    } else if (modalId === 'registerModal') {
      const registerForm = document.getElementById('registerForm');
      const passwordError = document.getElementById('passwordError');
      const phoneError = document.getElementById('phoneError');
      if (registerForm) registerForm.reset();
      if (passwordError) passwordError.textContent = '';
      if (phoneError) phoneError.textContent = '';
    }
  }
}

function switchModal(closeId, openId) {
  closeModal(closeId);
  setTimeout(() => openModal(openId), 300);
}

function togglePassword(element) {
  const passwordInput = element.previousElementSibling;
  const toggleIcon = element;
  if (passwordInput && passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.textContent = '🙈';
  } else if (passwordInput) {
    passwordInput.type = 'password';
    toggleIcon.textContent = '👁️';
  }
}

// Handle login with role-based redirection
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('loginUsername')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value?.trim();
  const loginError = document.getElementById('loginError');

  if (loginError) loginError.textContent = '';

  if (!username || !password) {
    if (loginError) loginError.textContent = 'Please enter both username and password';
    return;
  }

  try {
    showLoading(true);
    
    const result = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (result.success) {
      // Store user data
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('username', result.data.username);
      localStorage.setItem('email', result.data.email);
      localStorage.setItem('isPremium', result.data.isPremium);
      
      // Store full user data for role checking
      localStorage.setItem('userData', JSON.stringify({
        username: result.data.username,
        email: result.data.email,
        isPremium: result.data.isPremium,
        isAdmin: result.data.isAdmin || false
      }));
      
      showToast("✅ Login successful! Redirecting...");
      closeModal('loginModal');
      
      // Update navigation
      updateNavigation();
      
      // Role-based redirection
      setTimeout(() => {
        if (result.data.isAdmin || result.data.username === 'admin') {
          // Admin goes to admin panel
          window.location.href = 'admin.html';
        } else {
          // Regular users go to authenticated grammar checker
          window.location.href = 'index.html';
        }
      }, 1500);
    } else {
      if (loginError) loginError.textContent = result.error || 'Login failed';
    }
  } catch (error) {
    console.error('Login error:', error);
    if (loginError) {
      loginError.textContent = error.message || 'Login failed. Please try again.';
    }
  } finally {
    showLoading(false);
  }
}

// Handle register with auto-login
async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById('username')?.value?.trim();
  const password = document.getElementById('password')?.value;
  const phone = document.getElementById('phone')?.value?.trim();
  const email = document.getElementById('email')?.value?.trim();
  const passwordError = document.getElementById('passwordError');
  const phoneError = document.getElementById('phoneError');

  // Clear previous errors
  if (passwordError) passwordError.textContent = '';
  if (phoneError) phoneError.textContent = '';

  // Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;

  if (!username || !password || !email) {
    if (phoneError) phoneError.textContent = 'Username, password, and email are required';
    return;
  }

  if (!emailRegex.test(email)) {
    if (phoneError) phoneError.textContent = 'Invalid email format';
    return;
  }

  if (phone && !phoneRegex.test(phone)) {
    if (phoneError) phoneError.textContent = 'Phone number must have 10 digits';
    return;
  }

  if (password.length < 6) {
    if (passwordError) passwordError.textContent = 'Password must be at least 6 characters long';
    return;
  }

  try {
    showLoading(true);
    
    const result = await apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email, phone })
    });

    if (result.success) {
      // Store user data immediately after registration
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('username', result.data.username);
      localStorage.setItem('email', result.data.email);
      localStorage.setItem('isPremium', result.data.isPremium || false);
      
      localStorage.setItem('userData', JSON.stringify({
        username: result.data.username,
        email: result.data.email,
        isPremium: result.data.isPremium || false,
        isAdmin: false
      }));
      
      showToast('✅ Registration successful! Redirecting...');
      closeModal('registerModal');
      
      // Update navigation
      updateNavigation();
      
      setTimeout(() => {
        // New users go to authenticated grammar checker
        window.location.href = 'index.html';
      }, 1500);
    } else {
      if (phoneError) phoneError.textContent = result.error || 'Registration failed';
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (phoneError) {
      phoneError.textContent = error.message || 'Registration failed. Please try again.';
    }
  } finally {
    showLoading(false);
  }
}

function goToLogin() {
  closeModal('notificationModal');
  setTimeout(() => switchModal('registerModal', 'loginModal'), 300);
}

// Show toast notification
function showToast(message) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #323232;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    font-size: 16px;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    min-width: 300px;
    text-align: center;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// Show loading overlay
function showLoading(show = true) {
  let overlay = document.getElementById('loadingOverlay');
  
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
      
      overlay.innerHTML = `
        <div style="text-align: center; color: white;">
          <div style="
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          <p>Loading...</p>
        </div>
      `;
      
      // Add animation
      if (!document.getElementById('loadingStyles')) {
        const style = document.createElement('style');
        style.id = 'loadingStyles';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  } else {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

// Grammar check functionality for free users
async function checkGrammar() {
  const inputText = document.getElementById('inputText')?.value;
  const resultText = document.getElementById('resultText');
  const recommendationList = document.getElementById('recommendationList');
  const language = document.getElementById('languageSelect')?.value || 'en-US';

  if (!inputText || !inputText.trim()) {
    if (resultText) resultText.textContent = 'Result: Please enter text for grammar checking.';
    if (recommendationList) recommendationList.innerHTML = '';
    return;
  }

  // Check authentication and usage limits
  const isAuth = isAuthenticated();
  if (!isAuth && freeUsageCount >= MAX_FREE_USAGE) {
    showToast('⚠️ Free usage limit reached (3/3). Please register or login to continue.');
    openModal('registerModal');
    return;
  }

  // Language validation
  if (!validateLanguageMatch(inputText, language)) {
    const detectedLang = detectLanguage(inputText);
    const languageNames = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)', 
      'de-DE': 'German',
      'fr': 'French',
      'es': 'Spanish',
      'nl': 'Dutch'
    };
    
    showToast(`⚠️ Language mismatch: Text appears to be ${languageNames[detectedLang] || 'unknown'} but ${languageNames[language]} is selected.`);
    if (resultText) resultText.textContent = '❌ Error: Text language doesn\'t match selected language.';
    if (recommendationList) recommendationList.innerHTML = '';
    return;
  }

  try {
    showLoading(true);
    
    const result = await apiCall('/api/grammar/check', {
      method: 'POST',
      body: JSON.stringify({ text: inputText, language })
    });

    if (!result.success) {
      if (result.requiresAuth) {
        showToast('⚠️ ' + result.error);
        openModal('registerModal');
        return;
      }
      if (resultText) resultText.textContent = `❌ Error: ${result.error}`;
      if (recommendationList) recommendationList.innerHTML = '';
      return;
    }

    // Update usage count for free users
    if (!isAuth) {
      freeUsageCount++;
      localStorage.setItem('freeUsageCount', freeUsageCount.toString());
      
      const remaining = MAX_FREE_USAGE - freeUsageCount;
      if (remaining > 0) {
        showToast(`✅ Grammar check completed! ${remaining} free checks remaining.`);
      } else {
        showToast(`✅ Grammar check completed! This was your last free check.`);
      }
    } else {
      showToast('✅ Grammar check completed!');
    }

    const matches = result.data.matches;
    if (resultText) resultText.textContent = `Result: ${matches.length} issue(s) found.`;

    // Display suggestions
    if (recommendationList) {
      recommendationList.innerHTML = matches.map((match, index) => {
        const originalText = inputText.substring(match.offset, match.offset + match.length);
        const bestReplacement = match.replacements && match.replacements.length > 0 
          ? match.replacements[0].value 
          : 'No suggestion available';
        
        return `
          <li style="margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
            <div style="margin-bottom: 8px;">
              <strong style="color: #e74c3c;">❌ Issue:</strong> ${match.message}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Original:</strong> 
              <span style="background: #ffebee; padding: 2px 6px; border-radius: 3px; color: #c62828;">"${originalText}"</span>
            </div>
            <div style="margin-bottom: 10px;">
              <strong style="color: #27ae60;">✅ Suggestion:</strong> 
              <span style="background: #e8f5e8; padding: 2px 6px; border-radius: 3px; color: #2e7d32; font-weight: 500;">"${bestReplacement}"</span>
            </div>
            <div style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
              <strong>Category:</strong> ${match.category || 'Grammar'} | 
              <strong>Position:</strong> ${match.offset}-${match.offset + match.length}
            </div>
          </li>
        `;
      }).join('');
      
      if (matches.length === 0) {
        recommendationList.innerHTML = `
          <li style="padding: 20px; text-align: center; color: #27ae60; font-weight: 600;">
            🎉 Great! No grammar issues found in your text.
          </li>
        `;
      }
    }

  } catch (error) {
    console.error('Grammar check failed:', error);
    if (resultText) resultText.textContent = '❌ Error: ' + error.message;
    if (recommendationList) recommendationList.innerHTML = '';
    
    if (error.message.includes('Cannot connect to server')) {
      showToast('❌ Server connection failed. Please ensure the server is running.');
    }
  } finally {
    showLoading(false);
  }
}

// Load supported languages
async function loadLanguages() {
  try {
    const data = await apiCall('/api/grammar/languages');
    const select = document.getElementById('languageSelect');
    
    if (select && data.success) {
      select.innerHTML = '';
      data.data.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = `${lang.flag} ${lang.name}`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.log('Failed to load languages from API, using defaults');
    
    // Fallback to default languages
    const select = document.getElementById('languageSelect');
    if (select && select.children.length === 0) {
      const defaultLanguages = [
        { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
        { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
        { code: 'de-DE', name: 'German', flag: '🇩🇪' },
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'nl', name: 'Dutch', flag: '🇳🇱' }
      ];
      
      defaultLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = `${lang.flag} ${lang.name}`;
        select.appendChild(option);
      });
    }
  }
}

// Update navigation based on authentication status
function updateNavigation() {
  const authButtons = document.querySelector('.auth-buttons');
  const isAuth = isAuthenticated();
  
  if (isAuth && authButtons) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const username = userData.username || localStorage.getItem('username') || 'User';
    
    authButtons.innerHTML = `
      <span style="margin-right: 15px; color: #2c3e50; font-weight: 600;">Welcome, ${username}</span>
      <a href="#" class="logout" onclick="logout()" style="background: #e74c3c; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: 500;">Logout</a>
    `;
  } else if (authButtons) {
    authButtons.innerHTML = `
      <a href="#" class="login" onclick="openModal('loginModal')">Log In</a>
      <a href="#" class="signup" onclick="openModal('registerModal')">Sign Up</a>
    `;
  }
}

// Logout function
async function logout() {
  try {
    await apiCall('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // Clear all local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('isPremium');
    localStorage.removeItem('userData');
    
    showToast('✅ Logged out successfully');
    updateNavigation();
    
    setTimeout(() => {
      window.location.href = 'introduction.html';
    }, 1000);
  }
}

// Test server connection
async function testServerConnection() {
  try {
    const data = await apiCall('/api/status');
    console.log('✅ Server connection successful:', data);
    return true;
  } catch (error) {
    console.error('❌ Server connection failed:', error);
    
    // Show connection error to user
    const errorMsg = `
      <div style="
        background: #fee;
        border: 2px solid #e74c3c;
        border-radius: 8px;
        padding: 15px;
        margin: 20px;
        text-align: center;
        color: #c62828;
      ">
        <h3>⚠️ Server Connection Failed</h3>
        <p>Cannot connect to the backend server.</p>
        <p><strong>Please ensure:</strong></p>
        <ul style="text-align: left; margin: 10px 0;">
          <li>The server is running on <code>http://localhost:3000</code></li>
          <li>Run <code>npm install</code> to install dependencies</li>
          <li>Run <code>npm start</code> to start the server</li>
        </ul>
        <p style="font-size: 12px; margin-top: 15px; color: #666;">
          Error: ${error.message}
        </p>
      </div>
    `;
    
    // Display error in the page
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
      heroSection.innerHTML = errorMsg + heroSection.innerHTML;
    }
    
    return false;
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Grammar Checker App...');
  
  // Test server connection first
  const serverConnected = await testServerConnection();
  
  // Handle URL parameters
  const params = new URLSearchParams(window.location.search);
  if (params.get('animate') === 'left') {
    document.body.classList.add('slide-in-left');
  }

  // Setup Try for Free button with proper navigation
  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    ctaButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (isAuthenticated()) {
        // Authenticated users go to full app
        if (isAdmin()) {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
        return;
      }
      
      // Check free usage limit
      if (freeUsageCount >= MAX_FREE_USAGE) {
        showToast('⚠️ Free usage limit reached (3/3). Please register or login to continue.');
        openModal('registerModal');
        return;
      }
      
      // Redirect to free trial page
      window.location.href = 'indexxx.html';
    });
  }
  
  // Initialize UI
  updateNavigation();
  
  if (serverConnected) {
    await loadLanguages();
  }
  
  // Add input listener for grammar checking if available
  const inputText = document.getElementById('inputText');
  if (inputText && typeof checkGrammar === 'function') {
    inputText.addEventListener('input', debounce(checkGrammar, 1500));
  }
  
  // Update stats function for input
  function updateStats() {
    const text = inputText?.value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');
    
    if (wordCount) wordCount.textContent = words;
    if (charCount) charCount.textContent = chars;
  }
  
  if (inputText) {
    inputText.addEventListener('input', updateStats);
    updateStats(); // Initial stats
  }
  
  console.log('✅ App initialization complete');
});

// Utility function
function debounce(func, wait) {
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

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    closeModal(event.target.id);
  }
};

// Smooth page transitions
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || link.onclick || link.target === '_blank') return;
  
  e.preventDefault();
  document.body.style.opacity = '0.7';
  document.body.style.transition = 'opacity 0.3s ease';
  
  setTimeout(() => {
    window.location.href = href;
  }, 300);
});