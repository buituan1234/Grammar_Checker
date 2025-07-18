// index.js

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

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
};

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const loginError = document.getElementById('loginError');

    let adminData = JSON.parse(localStorage.getItem('adminData'));
    if (!adminData) {
        adminData = { username: 'admin', password: 'admin123' };
        localStorage.setItem('adminData', JSON.stringify(adminData));
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];

    if (username === adminData.username && password === adminData.password) {
        localStorage.setItem('loggedInUser', JSON.stringify({ username, role: 'admin' }));
        showToast("✅ Admin login successful!");
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);
        return;
    }

    const matchedUser = users.find(user => user.username === username && user.password === password);
    if (matchedUser) {
        localStorage.setItem('loggedInUser', JSON.stringify({ username, role: 'user' }));
        showToast("✅ User login successful!");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }

    loginError.textContent = 'Username or password is incorrect.';
}

function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const passwordError = document.getElementById('passwordError');
    const phoneError = document.getElementById('phoneError');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!emailRegex.test(email)) {
        passwordError.textContent = '';
        phoneError.textContent = 'Invalid email format';
        return;
    }
    if (!phoneRegex.test(phone)) {
        passwordError.textContent = '';
        phoneError.textContent = 'The phone number must have 10 digits.';
        return;
    }
    if (password.length < 6) {
        passwordError.textContent = 'The password must be at least 6 characters long.';
        phoneError.textContent = '';
        return;
    }

    const newUser = { username, password, phone, email };
    let users = JSON.parse(localStorage.getItem('users')) || [];

    if (users.find(u => u.username === username)) {
        phoneError.textContent = '';
        passwordError.textContent = 'Username already exists';
        return;
    }

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('userData', JSON.stringify(newUser));

    passwordError.textContent = '';
    phoneError.textContent = '';
    showToast('✅ You have successfully registered, would you like to switch to login??');

    const notificationModal = document.getElementById('notificationModal');
    const notificationContent = notificationModal.querySelector('.notification-content');
    notificationContent.innerHTML = `
        <span class="close" onclick="closeModal('notificationModal')">×</span>
        <p>You have successfully registered, would you like to switch to login?</p>
        <div class="notification-buttons">
            <button onclick="goToLogin()">Yes</button>
            <button onclick="closeModal('notificationModal')">No</button>
        </div>
    `;
    openModal('notificationModal');
}

function goToLogin() {
    closeModal('notificationModal');
    switchModal('registerModal', 'loginModal');
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('animate') === 'left') {
        document.body.classList.add('slide-in-left');
    }

    document.querySelector('.cta-button')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'indexxx.html';
    });
});

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        e.preventDefault();
        document.body.style.opacity = 0;
        setTimeout(() => window.location.href = href, 300);
    });
});

function showToast(message) {
    const toast = document.getElementById('loginSuccessToast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
} 

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

    try {
        const response = await fetch('http://localhost:3000/api/grammar/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: inputText, language })
        });

        const result = await response.json();

        if (!result.success) {
            resultText.textContent = `❌ Error: ${result.error}`;
            recommendationList.innerHTML = '';
            return;
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

        showToast('✅ Grammar check completed!');
    } catch (error) {
        console.error('Grammar check failed:', error);
        resultText.textContent = '❌ Error: Unable to connect to grammar checking service.';
    }
}

document.getElementById('inputText')?.addEventListener('input', checkGrammar);

function speakResult() {
    const resultText = document.getElementById('resultText').textContent.replace('Result: ', '');
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(resultText);
        utterance.lang = document.getElementById('languageSelect').value;
        window.speechSynthesis.speak(utterance);
        showToast('🔊 Đang phát âm thanh!');
    } else {
        showToast('⚠️ The browser does not support sound playback.');
    }
}

function copyToClipboard() {
    const resultText = document.getElementById('resultText').textContent.replace('Result: ', '');
    navigator.clipboard.writeText(resultText).then(() => {
        showToast('✅ The text has been copied!');
    });
}

function applySuggestion() {
    const recommendationList = document.getElementById('recommendationList');
    const selectedSuggestion = recommendationList.querySelector('li:hover') || recommendationList.querySelector('li');
    if (selectedSuggestion) {
        const suggestionText = selectedSuggestion.textContent;
        const resultText = document.getElementById('resultText');
        resultText.textContent = `Result: ${suggestionText.split('→')[1].trim()}`;
        showToast('✅ The suggestion has been applied !');
    } else {
        showToast('⚠️ Please select a suggestion.');
    }
}

async function loadLanguages() {
    try {
        const res = await fetch('http://localhost:3000/api/grammar/languages');
        const data = await res.json();
        const select = document.getElementById('languageSelect');
        data.data.languages.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = `${lang.flag} ${lang.name}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load languages', err);
    }
}

document.addEventListener('DOMContentLoaded', loadLanguages);