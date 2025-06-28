// Debugging: Log when script is loaded
console.log('Grammer-Checker.js loaded');

// Load user data from localStorage
function loadUserData() {
  console.log('loadUserData called');
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  const usernameInput = document.getElementById('settingUsername');
  const emailInput = document.getElementById('settingEmail');
  const phoneInput = document.getElementById('settingPhone');
  if (usernameInput && emailInput && phoneInput) {
    usernameInput.value = userData.username || '...';
    emailInput.value = userData.email || '...';
    phoneInput.value = userData.phone || '...';
  } else {
    console.error('Error: Settings input elements not found');
  }
}

// Toggle Settings Panel
function toggleSettingsPanel() {
  console.log('toggleSettingsPanel called');
  const panel = document.getElementById('settingsPanel');
  if (panel) {
    panel.classList.toggle('active');
  } else {
    console.error('Error: settingsPanel not found');
  }
}

// Close Settings Panel
function closeSettingsPanel() {
  console.log('closeSettingsPanel called');
  const panel = document.getElementById('settingsPanel');
  if (panel) {
    panel.classList.remove('active');
  } else {
    console.error('Error: settingsPanel not found');
  }
}

// Scroll to Top
function scrollToTop() {
  console.log('scrollToTop called');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Scroll to Section
function scrollToSection(sectionId) {
  console.log(`scrollToSection called for ${sectionId}`);
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    console.error(`Error: Section ${sectionId} not found`);
  }
}

// Toggle Language Dropdowns
function toggleLangDropdown2() {
  console.log('toggleLangDropdown2 called');
  const dropdown = document.getElementById('translateDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
  } else {
    console.error('Error: translateDropdown not found');
  }
}

function toggleLangDropdownBottom() {
  console.log('toggleLangDropdownBottom called');
  const dropdown = document.getElementById('translateDropdownBottom');
  if (dropdown) {
    dropdown.classList.toggle('active');
  } else {
    console.error('Error: translateDropdownBottom not found');
  }
}

function closeLangDropdown2() {
  console.log('closeLangDropdown2 called');
  const dropdown = document.getElementById('translateDropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

function closeLangDropdownBottom() {
  console.log('closeLangDropdownBottom called');
  const dropdown = document.getElementById('translateDropdownBottom');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

// Filter Languages
function filterTranslateLanguages() {
  console.log('filterTranslateLanguages called');
  const input = document.getElementById('translateSearch');
  const list = document.getElementById('translateList');
  if (input && list) {
    const searchValue = input.value.toLowerCase();
    const items = list.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
      const txtValue = items[i].getAttribute('data-lang').toLowerCase();
      items[i].style.display = txtValue.includes(searchValue) ? '' : 'none';
    }
  } else {
    console.error('Error: translateSearch or translateList not found');
  }
}

function filterTranslateLanguagesBottom() {
  console.log('filterTranslateLanguagesBottom called');
  const input = document.getElementById('translateSearchBottom');
  const list = document.getElementById('translateListBottom');
  if (input && list) {
    const searchValue = input.value.toLowerCase();
    const items = list.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
      const txtValue = items[i].getAttribute('data-lang').toLowerCase();
      items[i].style.display = txtValue.includes(searchValue) ? '' : 'none';
    }
  } else {
    console.error('Error: translateSearchBottom or translateListBottom not found');
  }
}

// Show Upload Box
function showUploadBox() {
  console.log('showUploadBox called');
  const uploadForm = document.getElementById('uploadFormContainer');
  if (uploadForm) {
    uploadForm.style.display = 'flex';
  } else {
    console.error('Error: uploadFormContainer not found');
  }
}

// Close Upload Form
function closeUploadForm() {
  console.log('closeUploadForm called');
  const uploadForm = document.getElementById('uploadFormContainer');
  if (uploadForm) {
    uploadForm.style.display = 'none';
  }
}

// Preview Avatar
function previewAvatar(event) {
  console.log('previewAvatar called');
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('previewAvatar');
      if (preview) {
        preview.src = e.target.result;
      } else {
        console.error('Error: previewAvatar not found');
      }
    };
    reader.readAsDataURL(file);
  }
}

function triggerAvatarInput() {
  console.log('triggerAvatarInput called');
  const avatarInput = document.getElementById('avatarInput');
  if (avatarInput) {
    avatarInput.click();
  } else {
    console.error('Error: avatarInput not found');
  }
}

// Save Settings
function saveSettings() {
  console.log('saveSettings called');
  const username = document.getElementById('settingUsername');
  const email = document.getElementById('settingEmail');
  const phone = document.getElementById('settingPhone');
  if (username && email && phone) {
    const userData = {
      username: username.value,
      email: email.value,
      phone: phone.value
    };
    localStorage.setItem('userData', JSON.stringify(userData));
    console.log('Saving settings:', userData);
    alert('Settings saved successfully!');
  } else {
    console.error('Error: Settings input elements not found');
  }
}




// Placeholder audio functions
function playInputAudio() {
  console.log('playInputAudio called');
  alert('Audio playback not implemented yet.');
}

function playGrammarAudio() {
  console.log('playGrammarAudio called');
  alert('Audio playback not implemented yet.');
}

function playTranslationAudio() {
  console.log('playTranslationAudio called');
  alert('Audio playback not implemented yet.');
}

// Apply Suggestion (placeholder)
function applySuggestion() {
  console.log('applySuggestion called');
  alert('Suggestion applied!');
}

// Upload Document (placeholder)
function uploadDocument() {
  console.log('uploadDocument called');
  alert('Upload functionality not implemented yet.');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  loadUserData();

  // Add event listeners for navigation links
  const grammarLink = document.getElementById('grammar-link');
  if (grammarLink) {
    grammarLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Grammar link clicked');
      scrollToTop();
    });
  } else {
    console.error('Error: grammar-link not found');
  }

  const aboutLink = document.getElementById('about-link');
  if (aboutLink) {
    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('About link clicked');
      scrollToSection('about');
    });
  } else {
    console.error('Error: about-link not found');
  }

  const featuresLink = document.getElementById('features-link');
  if (featuresLink) {
    featuresLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Features link clicked');
      scrollToSection('features');
    });
  } else {
    console.error('Error: features-link not found');
  }

  const testimonialsLink = document.getElementById('testimonials-link');
  if (testimonialsLink) {
    testimonialsLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Testimonials link clicked');
      scrollToSection('testimonials');
    });
  } else {
    console.error('Error: testimonials-link not found');
  }

  const faqLink = document.getElementById('faq-link');
  if (faqLink) {
    faqLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('FAQ link clicked');
      scrollToSection('faq');
    });
  } else {
    console.error('Error: faq-link not found');
  }

  const settingsLink = document.getElementById('settings-link');
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Settings link clicked');
      toggleSettingsPanel();
    });
  } else {
    console.error('Error: settings-link not found');
  }

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Logout link clicked');
      logout();
    });
  } else {
    console.error('Error: logout-link not found');
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Logout button in settings clicked');
      logout();
    });
  } else {
    console.error('Error: logout-btn not found');
  }
});

function toggleTheme() {
  const theme = document.getElementById("themeToggle").value;
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  }
}

// Load saved theme when page loads
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.getElementById("themeToggle").value = savedTheme;
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
});


function logout() {
  console.log('logout called');
  const modal = document.getElementById("logoutConfirmModal");
  if (modal) {
    modal.classList.remove("hidden"); // Hiện modal xác nhận custom
  }
}


  // Khi chọn "Có"
  function confirmLogout() {
    localStorage.removeItem("userData"); // hoặc sessionStorage.clear()
    window.location.href = "index.html"; // trang đăng nhập
  }

  // Khi chọn "Không"
  function closeLogoutModal() {
    document.getElementById("logoutConfirmModal").classList.add("hidden");
  }


