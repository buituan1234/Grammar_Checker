// Load user data from localStorage
function loadUserData() {
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  document.getElementById('dropdownUsername').textContent = userData.username || '...';
  document.getElementById('dropdownPhone').textContent = userData.phone || '...';
  document.getElementById('dropdownEmail').textContent = userData.email || '...';
  document.getElementById('settingUsername').textContent = userData.username || '...';
  document.getElementById('settingEmail').textContent = userData.email || '...';
  document.getElementById('settingPhone').textContent = userData.phone || '...';
}

document.addEventListener('DOMContentLoaded', loadUserData);

// Toggle Settings Panel
function toggleSettingsPanel() {
  const panel = document.getElementById('settingsPanel');
  panel.classList.toggle('active');
  document.getElementById('userDropdown').classList.remove('active');
}

// Toggle Language Dropdowns
function toggleLangDropdown2() {
  document.getElementById('translateDropdown').classList.toggle('active');
}

function toggleLangDropdownBottom() {
  document.getElementById('translateDropdownBottom').classList.toggle('active');
}

function closeLangDropdown2() {
  document.getElementById('translateDropdown').classList.remove('active');
}

function closeLangDropdownBottom() {
  document.getElementById('translateDropdownBottom').classList.remove('active');
}

// Filter Languages
function filterTranslateLanguages() {
  const input = document.getElementById('translateSearch').value.toLowerCase();
  const list = document.getElementById('translateList').getElementsByTagName('li');
  for (let i = 0; i < list.length; i++) {
    const txtValue = list[i].getAttribute('data-lang').toLowerCase();
    list[i].style.display = txtValue.includes(input) ? '' : 'none';
  }
}

function filterTranslateLanguagesBottom() {
  const input = document.getElementById('translateSearchBottom').value.toLowerCase();
  const list = document.getElementById('translateListBottom').getElementsByTagName('li');
  for (let i = 0; i < list.length; i++) {
    const txtValue = list[i].getAttribute('data-lang').toLowerCase();
    list[i].style.display = txtValue.includes(input) ? '' : 'none';
  }
}

// Show Upload Box
function showUploadBox() {
  document.getElementById('uploadFormContainer').style.display = 'flex';
}

// Close Upload Form
function closeUploadForm() {
  document.getElementById('uploadFormContainer').style.display = 'none';
}

// Preview Avatar
function previewAvatar(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('previewAvatar').src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function triggerAvatarInput() {
  document.getElementById('avatarInput').click();
}



// Placeholder audio functions (to be implemented)
function playInputAudio() {
  alert('Audio playback not implemented yet.');
}

function playGrammarAudio() {
  alert('Audio playback not implemented yet.');
}

function playTranslationAudio() {
  alert('Audio playback not implemented yet.');
}

// Apply Suggestion (placeholder)
function applySuggestion() {
  alert('Suggestion applied!');
}

// Upload Document (placeholder)
function uploadDocument() {
  alert('Upload functionality not implemented yet.');
}


// JavaScript for settings panel slide-in/out
      function toggleSettingsPanel() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('translate-x-full');
      }

      function closeSettingsPanel() {
        document.getElementById('settingsPanel').classList.add('translate-x-full');
      }

 

function logout() {
  console.log("Logging out...");
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('userData'); // chỉ xóa thông tin đăng nhập
    sessionStorage.clear();
    window.location.href = "../pages/index.html"; // chính xác đường dẫn về index.html
  }
}







