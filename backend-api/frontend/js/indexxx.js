class GrammarChecker {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentMatches = [];
        this.originalText = '';
    }

    initializeElements() {
        this.textInput = document.getElementById('textInput');
        this.checkBtn = document.getElementById('checkBtn');
        this.btnText = document.getElementById('btnText');
        this.loading = document.getElementById('loading');
        this.languageSelect = document.getElementById('languageSelect');
        this.highlightedText = document.getElementById('highlightedText');
        this.suggestionsPanel = document.getElementById('suggestionsPanel');
        this.wordCount = document.getElementById('wordCount');
        this.charCount = document.getElementById('charCount');
        this.errorCount = document.getElementById('errorCount');
    }

    bindEvents() {
        this.checkBtn.addEventListener('click', () => this.checkGrammar());
        this.textInput.addEventListener('input', () => this.updateStats());
        this.textInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.checkGrammar();
            }
        });
    }

    updateStats() {
        const text = this.textInput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        this.wordCount.textContent = words;
        this.charCount.textContent = chars;
    }

    showLoading() {
        this.btnText.classList.add('hidden');
        this.loading.classList.remove('hidden');
        this.checkBtn.disabled = true;
    }

    hideLoading() {
        this.btnText.classList.remove('hidden');
        this.loading.classList.add('hidden');
        this.checkBtn.disabled = false;
    }

    showError(message) {
        this.highlightedText.innerHTML = `
            <div class="error-message">
                <strong>❌ Error:</strong> ${message}
            </div>
        `;
    }

    showSuccess() {
        this.highlightedText.innerHTML = `
            <div class="success-message">
                <strong>✅ Perfect!</strong><br>
                No grammar errors found in your text.
            </div>
        `;
    }

    async checkGrammar() {
        const text = this.textInput.value.trim();
        const language = this.languageSelect.value;

        if (!text) {
            this.showError('Please enter text to check');
            return;
        }

        if (text.length > 10000) {
            this.showError('Text is too long. Please enter up to 10,000 characters');
            return;
        }

        this.showLoading();
        this.originalText = text;

        try {
            const result = await this.callLanguageToolAPI(text, language);
            this.processResults(result);
        } catch (error) {
            console.error('Grammar check error:', error);
            this.showError('Unable to connect to grammar checking service. Please try again later.');
        } finally {
            this.hideLoading();
        }
    }

    async callLanguageToolAPI(text, language) {
        const params = new URLSearchParams({
            text: text,
            language: language,
            enabledOnly: 'false'
        });

        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    processResults(result) {
        this.currentMatches = result.matches || [];
        this.errorCount.textContent = this.currentMatches.length;

        if (this.currentMatches.length === 0) {
            this.showSuccess();
            this.suggestionsPanel.classList.add('hidden');
            return;
        }

        this.highlightErrors();
        this.displaySuggestions();
    }

    highlightErrors() {
        let highlightedHTML = this.originalText;
        const matches = [...this.currentMatches].sort((a, b) => b.offset - a.offset);

        matches.forEach((match, index) => {
            const before = highlightedHTML.substring(0, match.offset);
            const error = highlightedHTML.substring(match.offset, match.offset + match.length);
            const after = highlightedHTML.substring(match.offset + match.length);

            highlightedHTML = before +
                `<span class="error-highlight" data-match-index="${index}" title="${match.message}">` +
                error +
                '</span>' +
                after;
        });

        this.highlightedText.innerHTML = highlightedHTML.replace(/\n/g, '<br>');

        this.highlightedText.querySelectorAll('.error-highlight').forEach(span => {
            span.addEventListener('click', (e) => {
                const matchIndex = parseInt(e.target.dataset.matchIndex);
                this.scrollToSuggestion(matchIndex);
            });
        });
    }

    displaySuggestions() {
        const suggestionsHTML = this.currentMatches.map((match, index) => {
            const errorText = this.originalText.substring(match.offset, match.offset + match.length);
            const replacements = match.replacements.slice(0, 5);

            return `
                <div class="suggestion-item" data-match-index="${index}">
                    <div class="suggestion-error">"${errorText}"</div>
                    <div class="suggestion-message">${match.message}</div>
                    <div class="suggestion-fixes">
                        ${replacements.map(replacement =>
                            `<span class="suggestion-fix" data-replacement="${replacement.value}">
                                ${replacement.value}
                            </span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }).join('');

        this.suggestionsPanel.innerHTML = suggestionsHTML;
        this.suggestionsPanel.classList.remove('hidden');

        this.suggestionsPanel.querySelectorAll('.suggestion-fix').forEach(fix => {
            fix.addEventListener('click', (e) => {
                const matchIndex = parseInt(e.target.closest('.suggestion-item').dataset.matchIndex);
                const replacement = e.target.dataset.replacement;
                this.applySuggestion(matchIndex, replacement);
            });
        });
    }

    applySuggestion(matchIndex, replacement) {
        const match = this.currentMatches[matchIndex];
        const currentText = this.textInput.value;

        const before = currentText.substring(0, match.offset);
        const after = currentText.substring(match.offset + match.length);

        this.textInput.value = before + replacement + after;
        this.updateStats();

        const lengthDiff = replacement.length - match.length;
        this.currentMatches = this.currentMatches.filter((_, index) => index !== matchIndex)
            .map(m => {
                if (m.offset > match.offset) {
                    return { ...m, offset: m.offset + lengthDiff };
                }
                return m;
            });

        this.errorCount.textContent = this.currentMatches.length;
        if (this.currentMatches.length === 0) {
            this.showSuccess();
            this.suggestionsPanel.classList.add('hidden');
        } else {
            this.originalText = this.textInput.value;
            this.highlightErrors();
            this.displaySuggestions();
        }
    }

    scrollToSuggestion(matchIndex) {
        const suggestionItem = this.suggestionsPanel.querySelector(`[data-match-index="${matchIndex}"]`);
        if (suggestionItem) {
            suggestionItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            suggestionItem.style.background = '#fef3c7';
            setTimeout(() => {
                suggestionItem.style.background = '';
            }, 1000);
        }
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchModal(closeId, openId) {
    closeModal(closeId);
    openModal(openId);
}

function togglePassword(element) {
    const input = element.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    element.textContent = input.type === 'password' ? '👁️' : '🙈';
}

function showToast(message = '✅ Login successful!') {
    const toast = document.getElementById('loginSuccessToast');
    toast.innerHTML = `<span>${message}</span>`;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');

    if (username === 'admin' && password === 'admin123') {
        errorElement.classList.remove('active');
        closeModal('loginModal');
        localStorage.setItem('adminData', JSON.stringify({ username: 'admin' }));
        showToast('✅ Admin login successful!');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        errorElement.classList.remove('active');
        closeModal('loginModal');
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        showToast();
        window.location.href = 'index.html';
    } else {
        errorElement.textContent = 'Invalid username or password';
        errorElement.classList.add('active');
    }
}

function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const passwordError = document.getElementById('passwordError');
    const phoneError = document.getElementById('phoneError');
    const emailError = document.getElementById('emailError');

    // Password validation
    if (password.length < 6) {
        passwordError.textContent = 'Password must be at least 6 characters';
        passwordError.classList.add('active');
        return;
    } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        passwordError.textContent = 'Password must contain at least one uppercase letter, one number, and one special character';
        passwordError.classList.add('active');
        return;
    } else {
        passwordError.classList.remove('active');
    }

    // Phone validation
    if (!/^\+?\d{10,}$/.test(phone)) {
        phoneError.textContent = 'Please enter a valid phone number';
        phoneError.classList.add('active');
        return;
    } else {
        phoneError.classList.remove('active');
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.classList.add('active');
        return;
    } else {
        emailError.classList.remove('active');
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.some(u => u.username === username)) {
        passwordError.textContent = 'Username already exists';
        passwordError.classList.add('active');
        return;
    }
    if (users.some(u => u.email === email)) {
        emailError.textContent = 'Email already registered';
        emailError.classList.add('active');
        return;
    }

    users.push({ username, password, phone, email });
    localStorage.setItem('users', JSON.stringify(users));
    closeModal('registerModal');
    showToast('✅ Registration successful! Would you like to log in now?');
    switchModal('registerModal', 'loginModal');
}

function handleLogout() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('adminData');
    showToast('✅ Logged out successfully!');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

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

document.addEventListener('DOMContentLoaded', () => {
    window.grammarChecker = new GrammarChecker();
    const sampleTexts = [
        "This is an example text with some grammar mistakes that need to be fixed.",
        "I have went to the store yesterday and buyed some groceries.",
        "She don't know how to swimming very good.",
        "The weather is very nice today, isn't it?"
    ];

    const sampleBtn = document.createElement('button');
    sampleBtn.textContent = 'Sample Text';
    sampleBtn.className = 'check-btn';
    sampleBtn.style.background = '#6b7280';
    sampleBtn.style.marginLeft = '0.5rem';
    sampleBtn.addEventListener('click', () => {
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        document.getElementById('textInput').value = randomText;
        window.grammarChecker.updateStats();
    });

    document.querySelector('.controls').appendChild(sampleBtn);
});
document.querySelectorAll('.nav-menu a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        if (this.textContent.trim().toLowerCase() === 'grammar') {
            e.preventDefault();
            window.location.href = 'indexx.html';
        } else if (this.getAttribute('href').startsWith('#') && !this.classList.contains('login') && !this.classList.contains('register')) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        }
    });
});

function showUploadForm() {
    document.getElementById('uploadFormContainer').classList.add('active');
}

function closeUploadForm() {
    document.getElementById('uploadFormContainer').classList.remove('active');
}

function uploadDocument() {
    closeUploadForm();
}


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
