// Grammar-Checker.js

function loginUser(username, email, phone) {
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
    localStorage.setItem('phone', phone || 'Not provided');
    loadUserInfo();
    console.log('User logged in:', { username, email, phone });
    window.location.href = 'index.html';
}

function toggleLangDropdown2() {
    document.getElementById('translateDropdown')?.classList.toggle('active');
}

function toggleLangDropdownBottom() {
    document.getElementById('translateDropdownBottom')?.classList.toggle('active');
}

function closeLangDropdown2() {
    document.getElementById('translateDropdown')?.classList.remove('active');
}

function closeLangDropdownBottom() {
    document.getElementById('translateDropdownBottom')?.classList.remove('active');
}

function filterTranslateLanguages() {
    const search = document.getElementById('translateSearch').value.toLowerCase();
    const items = document.getElementById('translateList').getElementsByTagName('li');
    for (let item of items) {
        item.style.display = item.textContent.toLowerCase().includes(search) ? '' : 'none';
    }
}

function filterTranslateLanguagesBottom() {
    const search = document.getElementById('translateSearchBottom').value.toLowerCase();
    const items = document.getElementById('translateListBottom').getElementsByTagName('li');
    for (let item of items) {
        item.style.display = item.textContent.toLowerCase().includes(search) ? '' : 'none';
    }
}

function showUploadBox() {
    document.getElementById('uploadFormContainer')?.classList.add('active');
}

function closeUploadForm() {
    document.getElementById('uploadFormContainer')?.classList.remove('active');
}

function playInputAudio() {
    console.log('Play input audio triggered');
}

function playGrammarAudio() {
    console.log('Play grammar audio triggered');
}

function playTranslationAudio() {
    console.log('Play translation audio triggered');
}

function applySuggestion() {
    console.log('Apply suggestion triggered');
}

function uploadDocument() {
    const fileInput = document.getElementById('documentFile');
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileInput?.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
        console.log('File uploaded:', fileInput.files[0].name);
    }
}

function triggerAvatarInput() {
    document.getElementById('avatarInput')?.click();
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
    document.getElementById('settingsPanel')?.classList.remove('active');
}

function saveSettings() {
    console.log('No changes saved: user information is readonly.');
}

function toggleTheme() {
    const theme = document.getElementById('themeToggle')?.value;
    document.body.className = theme === 'dark' ? 'dark' : '';
}

function showLogoutModal() {
    document.getElementById('logoutConfirmModal')?.classList.add('active');
}

function confirmLogout() {
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('phone');
    window.location.href = 'index.html';
}

function closeLogoutModal() {
    document.getElementById('logoutConfirmModal')?.classList.remove('active');
}

function loadUserInfo() {
    const username = localStorage.getItem('username') || 'Guest';
    const email = localStorage.getItem('email') || 'example@email.com';
    const phone = localStorage.getItem('phone') || 'Not provided';

    document.getElementById('settingUsername').value = username;
    document.getElementById('settingEmail').value = email;
    document.getElementById('settingPhone').value = phone;
}

function toggleHistory() {
    console.log('Toggle history triggered');
}

function saveHistory(text) {
    const modalHistoryList = document.getElementById('modalHistoryList');
    if (modalHistoryList && text) {
        const li = document.createElement('li');
        const timestamp = new Date().toLocaleString('en-US', { 
            hour12: true, 
            timeZone: 'Asia/Ho_Chi_Minh', 
            hour: '2-digit', 
            minute: '2-digit', 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        li.textContent = `${timestamp}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
        modalHistoryList.appendChild(li);
        localStorage.setItem('grammarHistory', modalHistoryList.innerHTML);
    }
}

function loadHistory() {
    const modalHistoryList = document.getElementById('modalHistoryList');
    const savedHistory = localStorage.getItem('grammarHistory');
    if (modalHistoryList && savedHistory) {
        modalHistoryList.innerHTML = savedHistory;
    }
}

function showHistoryModal() {
    document.getElementById('historyModal')?.classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal')?.classList.remove('active');
}

function clearHistory() {
    document.getElementById('modalHistoryList').innerHTML = '';
    localStorage.removeItem('grammarHistory');
    closeHistoryModal();
}

async function checkGrammar() {
    const inputField = document.getElementById('inputText');
    const resultText = document.getElementById('resultText');
    const recommendationList = document.getElementById('recommendationList');
    const language = document.getElementById('languageSelect')?.value || 'en-US';

    if (!inputField || inputField.value.trim() === '') {
        alert('Please enter some text to check.');
        return;
    }

    try {
        const response = await fetch('/api/grammar/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: inputField.value,
                language
            })
        });

        const result = await response.json();

        if (!result.success) {
            resultText.textContent = `❌ Error: ${result.error}`;
            return;
        }

        const matches = result.data.matches || [];
        resultText.textContent = `Result: ${matches.length} issue(s) found.`;

        if (recommendationList) {
            recommendationList.innerHTML = matches.map(match => `
                <li>
                    <strong>${match.message}</strong><br>
                    <span>Suggestion: ${match.replacements.map(r => r.value).join(', ') || 'None'}</span><br>
                    <span style="font-size: 12px; color: gray">Category: ${match.category}, Severity: ${match.severity}</span>
                </li>
            `).join('');
        }

        // Lưu lịch sử
        saveHistory(inputField.value);

    } catch (err) {
        console.error('Grammar API failed:', err);
        resultText.textContent = '❌ Error connecting to grammar checking service.';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadHistory();

    document.querySelectorAll('nav ul li a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            const headerHeight = document.querySelector('header').offsetHeight || 0;
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - headerHeight,
                    behavior: 'smooth'
                });
            }
        });
    });

    document.getElementById('settings-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('settingsPanel')?.classList.add('active');
        loadUserInfo();
    });

    document.getElementById('logout-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        showLogoutModal();
    });

    document.querySelectorAll('#translateList li')?.forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('translateInput').value = item.dataset.lang;
            closeLangDropdown2();
        });
    });

    document.querySelectorAll('#translateListBottom li')?.forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('translateInputBottom').value = item.dataset.lang;
            closeLangDropdownBottom();
        });
    });
});
