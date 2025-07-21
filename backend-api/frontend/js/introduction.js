// introduction.js - Complete update with proper language support

// Free usage tracking
let freeUsageCount = parseInt(localStorage.getItem('freeUsageCount') || '0');
const MAX_FREE_USAGE = 3;

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
  return localStorage.getItem('authToken') !== null;
}

// Handle modal open/close
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = 'flex';
  const modalContent = modal.querySelector('.modal-content');
  modalContent.classList.remove('slide-left', 'slide-right');

  if (modalId === 'registerModal') {
    modalContent.classList.add('slide-left');
  } else if (modalId === 'loginModal') {
    modalContent.classList.add('slide-right');
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  if (modalId === 'loginModal') {
    document.getElementById('loginForm')?.reset();
    document.getElementById('loginError').textContent = '';
  } else if (modalId === 'registerModal') {
    document.getElementById('registerForm')?.reset();
    document.getElementById('passwordError').textContent = '';
    document.getElementById('phoneError').textContent = '';
  }
}

function switchModal(closeId, openId) {
  closeModal(closeId);
  openModal(openId);
}

function togglePassword(element) {
  const passwordInput = element.previousElementSibling;
  const toggleIcon = element;
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.textContent = '🙈';
  } else {
    passwordInput.type = 'password';
    toggleIcon.textContent = '👁️';
  }
}

// Handle login with backend API
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const loginError = document.getElementById('loginError');

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (result.success) {
      // Store auth data
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('username', result.data.username);
      localStorage.setItem('email', result.data.email);
      
      showToast("✅ Login successful!");
      closeModal('loginModal');
      
      setTimeout(() => {
        window.location.href = 'indexxx.html';
      }, 1500);
    } else {
      loginError.textContent = result.error || 'Invalid credentials';
    }
  } catch (error) {
    console.error('Login error:', error);
    loginError.textContent = 'Network error. Please try again.';
  }
}

// Handle register with backend API
async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const phone = document.getElementById('phone').value;
  const email = document.getElementById('email').value;
  const passwordError = document.getElementById('passwordError');
  const phoneError = document.getElementById('phoneError');

  // Client-side validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;

  passwordError.textContent = '';
  phoneError.textContent = '';

  if (!emailRegex.test(email)) {
    phoneError.textContent = 'Invalid email format';
    return;
  }
  if (!phoneRegex.test(phone)) {
    phoneError.textContent = 'The phone number must have 10 digits.';
    return;
  }
  if (password.length < 6) {
    passwordError.textContent = 'The password must be at least 6 characters long.';
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, email })
    });

    const result = await response.json();

    if (result.success) {
      showToast('✅ Registration successful! Please login.');
      
      // Switch to login modal
      setTimeout(() => {
        switchModal('registerModal', 'loginModal');
      }, 1500);
    } else {
      phoneError.textContent = result.error || 'Registration failed';
    }
  } catch (error) {
    console.error('Registration error:', error);
    phoneError.textContent = 'Network error. Please try again.';
  }
}

function goToLogin() {
  closeModal('notificationModal');
  switchModal('registerModal', 'loginModal');
}

// Show toast notification
function showToast(message) {
  const toast = document.getElementById('loginSuccessToast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Upload document
function uploadDocument() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.docx,.pdf';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        document.getElementById('inputText').value = event.target.result;
        showToast('✅ The document has been uploaded!');
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// Check grammar with proper language support
async function checkGrammar() {
  const inputText = document.getElementById('inputText').value;
  const resultText = document.getElementById('resultText');
  const recommendationList = document.getElementById('recommendationList');
  const language = document.getElementById('languageSelect')?.value || 'en-US';

  if (!inputText.trim()) {
    resultText.textContent = 'Result: Please enter or upload text for verification.';
    recommendationList.innerHTML = '';
    return;
  }

  // Check authentication and free usage
  const isAuth = isAuthenticated();
  if (!isAuth && freeUsageCount >= MAX_FREE_USAGE) {
    showToast('⚠️ Free usage limit reached. Please register or login.');
    openModal('registerModal');
    return;
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId()
    };

    if (isAuth) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('authToken')}`;
    }

    const response = await fetch('http://localhost:3000/api/grammar/check', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ text: inputText, language })
    });

    const result = await response.json();

    if (!result.success) {
      if (result.requiresAuth) {
        showToast('⚠️ ' + result.error);
        openModal('registerModal');
        return;
      }
      resultText.textContent = `❌ Error: ${result.error}`;
      recommendationList.innerHTML = '';
      return;
    }

    // Update free usage count
    if (!isAuth) {
      freeUsageCount++;
      localStorage.setItem('freeUsageCount', freeUsageCount.toString());
      
      // Show remaining checks
      const remaining = result.data.usage.remainingChecks;
      if (remaining > 0) {
        showToast(`✅ Grammar check completed! ${remaining} free checks remaining.`);
      }
    } else {
      showToast('✅ Grammar check completed!');
    }

    const matches = result.data.matches;
    resultText.textContent = `Result: ${matches.length} issue(s) found.`;

    recommendationList.innerHTML = matches.map(match => `
      <li>
        <strong>${match.message}</strong><br>
        <span>Suggestion: ${match.replacements.map(r => r.value).join(', ') || 'None'}</span><br>
        <span style="font-size: 12px; color: gray">Category: ${match.category}, Severity: ${match.severity}</span>
      </li>
    `).join('');

  } catch (error) {
    console.error('Grammar check failed:', error);
    resultText.textContent = '❌ Error: Unable to connect to grammar checking service.';
  }
}

// Speak result
function speakResult() {
  const resultText = document.getElementById('resultText').textContent.replace('Result: ', '');
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(resultText);
    utterance.lang = document.getElementById('languageSelect').value;
    window.speechSynthesis.speak(utterance);
    showToast('🔊 Playing audio!');
  } else {
    showToast('⚠️ The browser does not support sound playback.');
  }
}

// Copy to clipboard
function copyToClipboard() {
  const resultText = document.getElementById('resultText').textContent.replace('Result: ', '');
  navigator.clipboard.writeText(resultText).then(() => {
    showToast('✅ The text has been copied!');
  });
}

// Apply suggestion
function applySuggestion() {
  const recommendationList = document.getElementById('recommendationList');
  const selectedSuggestion = recommendationList.querySelector('li:hover') || recommendationList.querySelector('li');
  if (selectedSuggestion) {
    const suggestionText = selectedSuggestion.textContent;
    const resultText = document.getElementById('resultText');
    resultText.textContent = `Result: ${suggestionText.split('→')[1]?.trim() || 'Applied'}`;
    showToast('✅ The suggestion has been applied!');
  } else {
    showToast('⚠️ Please select a suggestion.');
  }
}

// Load languages from API
async function loadLanguages() {
  try {
    const res = await fetch('http://localhost:3000/api/grammar/languages');
    const data = await res.json();
    const select = document.getElementById('languageSelect');
    if (select) {
      select.innerHTML = ''; // Clear existing options
      data.data.languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = `${lang.flag} ${lang.name}`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load languages', err);
  }
}

// Load usage info on page load
async function loadUsageInfo() {
  try {
    const headers = {
      'X-Session-ID': getSessionId()
    };

    if (isAuthenticated()) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('authToken')}`;
    }

    const res = await fetch('http://localhost:3000/api/grammar/usage', { headers });
    const data = await res.json();
    
    if (data.success) {
      freeUsageCount = data.data.used;
      localStorage.setItem('freeUsageCount', freeUsageCount.toString());
    }
  } catch (err) {
    console.error('Failed to load usage info', err);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('animate') === 'left') {
    document.body.classList.add('slide-in-left');
  }

  // Try for Free button handler
  document.querySelector('.cta-button')?.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Check if user is authenticated
    if (isAuthenticated()) {
      window.location.href = 'indexxx.html';
      return;
    }
    
    // Check free usage limit
    if (freeUsageCount >= MAX_FREE_USAGE) {
      showToast('⚠️ You have reached the free usage limit. Please register or login to continue.');
      openModal('registerModal');
      return;
    }
    
    // Redirect to grammar checker
    window.location.href = 'indexxx.html';
  });
  
  // Update navigation based on auth status
  updateNavigation();
  
  // Load languages
  loadLanguages();
  
  // Load usage info
  loadUsageInfo();
  
  // Add input listener for real-time checking
  document.getElementById('inputText')?.addEventListener('input', checkGrammar);
});

// Update navigation based on authentication
function updateNavigation() {
  const authButtons = document.querySelector('.auth-buttons');
  const isAuth = isAuthenticated();
  
  if (isAuth && authButtons) {
    const username = localStorage.getItem('username') || 'User';
    authButtons.innerHTML = `
      <span style="margin-right: 15px;">Welcome, ${username}</span>
      <a href="#" class="logout" onclick="logout()">Logout</a>
    `;
  }
}

// Logout function
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  showToast('✅ Logged out successfully');
  updateNavigation();
  setTimeout(() => {
    window.location.href = 'introduction.html';
  }, 1000);
}

// Handle window clicks for modal closing
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    closeModal(event.target.id);
  }
};

// Smooth scrolling for navigation links
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (link.onclick) return; // Skip if has onclick handler
    e.preventDefault();
    document.body.style.opacity = 0;
    setTimeout(() => window.location.href = href, 300);
  });
});