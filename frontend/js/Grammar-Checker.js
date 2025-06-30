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

function filterTranslateLanguages() {
    const search = document.getElementById('translateSearch').value.toLowerCase();
    const items = document.getElementById('translateList').getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        const text = items[i].textContent.toLowerCase();
        items[i].style.display = text.includes(search) ? '' : 'none';
    }
}

function filterTranslateLanguagesBottom() {
    const search = document.getElementById('translateSearchBottom').value.toLowerCase();
    const items = document.getElementById('translateListBottom').getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        const text = items[i].textContent.toLowerCase();
        items[i].style.display = text.includes(search) ? '' : 'none';
    }
}

function showUploadBox() {
    document.getElementById('uploadFormContainer').classList.add('active');
}

function closeUploadForm() {
    document.getElementById('uploadFormContainer').classList.remove('active');
}

function playInputAudio() {
    // Implement audio playback for input text
}

function playGrammarAudio() {
    // Implement audio playback for grammar result
}

function playTranslationAudio() {
    // Implement audio playback for translation
}

function applySuggestion() {
    // Implement suggestion application
}

function uploadDocument() {
    const fileInput = document.getElementById('documentFile');
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
        // Implement file upload logic
    }
}

function triggerAvatarInput() {
    document.getElementById('avatarInput').click();
}

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

function closeSettingsPanel() {
    document.getElementById('settingsPanel').classList.remove('active');
}

function saveSettings() {
    // No-op since fields are readonly
    console.log('No changes saved: user information is readonly.');
}

function toggleTheme() {
    const theme = document.getElementById('themeToggle').value;
    document.body.className = theme === 'dark' ? 'dark' : '';
}

function showLogoutModal() {
    document.getElementById('logoutConfirmModal').classList.add('active');
}

function confirmLogout() {
    // Clear user data from localStorage on logout
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('phone');
    window.location.href = 'index.html';
}

function closeLogoutModal() {
    document.getElementById('logoutConfirmModal').classList.remove('active');
}

function loadUserInfo() {
    // Retrieve user data from localStorage
    const username = localStorage.getItem('username') || '';
    const email = localStorage.getItem('email') || '';
    const phone = localStorage.getItem('phone') || '';
    
    document.getElementById('settingUsername').value = username;
    document.getElementById('settingEmail').value = email;
    document.getElementById('settingPhone').value = phone;
}

// Smooth scrolling for navigation links with offset for sticky header
document.querySelectorAll('nav ul li a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            const headerHeight = document.querySelector('header').offsetHeight;
            window.scrollTo({
                top: targetElement.offsetTop - headerHeight,
                behavior: 'smooth'
            });
        }
    });
});

document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('settingsPanel').classList.add('active');
});

document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('logoutConfirmModal').classList.add('active');
});

document.querySelectorAll('#translateList li').forEach(item => {
    item.addEventListener('click', () => {
        document.getElementById('translateInput').value = item.dataset.lang;
        closeLangDropdown2();
    });
});

document.querySelectorAll('#translateListBottom li').forEach(item => {
    item.addEventListener('click', () => {
        document.getElementById('translateInputBottom').value = item.dataset.lang;
        closeLangDropdownBottom();
    });
});

// Load user info on page load
document.addEventListener('DOMContentLoaded', loadUserInfo);