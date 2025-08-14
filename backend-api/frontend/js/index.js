// Grammar Checker for Authenticated Users - No Usage Limits
class GrammarChecker {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentMatches = [];
        this.originalText = '';
        this.loadUserSettings();
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
        this.settingUsername = document.getElementById('settingUsername');
        this.settingEmail = document.getElementById('settingEmail');
        this.settingPhone = document.getElementById('settingPhone');
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

    loadUserSettings() {
        const userData = JSON.parse(localStorage.getItem('userSettings')) || {};
        if (this.settingUsername) this.settingUsername.value = userData.username || '';
        if (this.settingEmail) this.settingEmail.value = userData.email || '';
        if (this.settingPhone) this.settingPhone.value = userData.phone || '';
    }

    updateStats() {
        const text = this.textInput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        if (this.wordCount) this.wordCount.textContent = words;
        if (this.charCount) this.charCount.textContent = chars;
    }

    showLoading() {
        if (this.btnText) this.btnText.classList.add('hidden');
        if (this.loading) this.loading.classList.remove('hidden');
        if (this.checkBtn) this.checkBtn.disabled = true;
    }

    hideLoading() {
        if (this.btnText) this.btnText.classList.remove('hidden');
        if (this.loading) this.loading.classList.add('hidden');
        if (this.checkBtn) this.checkBtn.disabled = false;
    }

    showError(message) {
        if (this.highlightedText) {
            this.highlightedText.innerHTML = `
                <div class="error-message">
                    <strong>❌ Error:</strong> ${message}
                </div>
            `;
        }
    }

    showSuccess() {
        if (this.highlightedText) {
            this.highlightedText.innerHTML = `
                <div class="success-message">
                    <strong>✅ Perfect!</strong><br>
                    No grammar errors found in your text.
                </div>
            `;
        }
    }

    // Helper method để lấy session ID
    getSessionId() {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Phát hiện ngôn ngữ của text - ENHANCED VERSION
    detectLanguage(text) {
        const patterns = {
            'de-DE': {
                chars: /[äöüßÄÖÜ]/g,
                words: /\b(der|die|das|und|ist|sind|ich|wir|sie|er|es|haben|hat|wird|wurde|werden|mit|von|zu|in|auf|für|als|aber|oder|wenn|dann|auch|noch|nur|schon|sehr|so|wie|was|wo|wer|warum|wann|ein|eine|einen|einem|einer|eines|nicht|kann|will|soll|muss|darf|mag|möchte|könnte|würde|sollte|müsste|dürfte|mögen|meine|mein|schwester|fährt|audi|dieser|diese|dieses|heute|morgen|gestern|gut|schlecht|groß|klein|neu|alt|jung|schön|hässlich)\b/gi
            },
            'fr': {
                chars: /[àâäéèêëïîôöùûüÿç]/g,
                words: /\b(le|la|les|et|est|sont|je|nous|vous|ils|elles|avoir|être|faire|dire|aller|voir|savoir|pouvoir|falloir|vouloir|venir|prendre|donner|avec|dans|pour|sur|par|comme|mais|ou|si|tout|même|bien|encore|aussi|déjà|toujours|jamais|plus|moins|beaucoup|peu|très|assez|trop|un|une|des|du|de|cette|ce|ces|que|qui|dont|où|ne|pas|non|oui|cette|aujourd|hier|demain|bon|mauvais|grand|petit|nouveau|vieux|jeune|beau|laid)\b/gi
            },
            'es': {
                chars: /[ñáéíóúü]/g,
                words: /\b(el|la|los|las|y|es|son|yo|nosotros|ellos|ser|estar|tener|hacer|decir|ir|ver|saber|poder|querer|venir|dar|llevar|con|en|para|por|como|pero|o|si|todo|mismo|bien|aún|también|ya|siempre|nunca|más|menos|mucho|poco|muy|bastante|demasiado|un|una|unos|unas|del|al|esta|este|estos|estas|que|qué|quien|quién|donde|dónde|cuando|cuándo|no|sí|hoy|mañana|ayer|bueno|malo|grande|pequeño|nuevo|viejo|joven|hermoso|feo)\b/gi
            },
            'nl': {
                chars: /\b(ij|zij|wij|mij|jij)\b/gi,
                words: /\b(de|het|en|is|zijn|ik|wij|zij|hij|hebben|heeft|zal|zou|worden|met|van|in|op|voor|als|maar|of|dus|want|omdat|zodat|terwijl|hoewel|indien|wanneer|waar|wie|wat|hoe|waarom|heel|zeer|erg|best|goed|slecht|groot|klein|nieuw|oud|jong|mooi|lelijk|een|alle|deze|dit|die|dat|niet|wel|ja|nee|vandaag|morgen|gisteren)\b/gi
            },
            'en-US': {
                chars: /^[a-zA-Z\s.,!?;:'"()\-0-9]+$/,
                words: /\b(the|and|is|are|was|were|have|has|will|would|I|we|you|he|she|it|they|this|that|with|from|to|of|in|on|at|by|for|as|but|or|if|all|any|some|each|every|other|another|such|only|own|same|so|than|too|very|can|could|should|may|might|must|shall|here|there|where|when|why|how|what|who|which|color|center|realize|organize|analyze|a|an|be|do|go|get|make|take|come|see|know|think|feel|work|play|run|walk|talk|look|find|give|say|tell|ask|help|use|try|want|need|like|love|hate|good|bad|big|small|new|old|young|beautiful|ugly|not|yes|no|today|tomorrow|yesterday)\b/gi
            },
            'en-GB': {
                chars: /^[a-zA-Z\s.,!?;:'"()\-0-9]+$/,
                words: /\b(the|and|is|are|was|were|have|has|will|would|I|we|you|he|she|it|they|this|that|with|from|to|of|in|on|at|by|for|as|but|or|if|all|any|some|each|every|other|another|such|only|own|same|so|than|too|very|can|could|should|may|might|must|shall|here|there|where|when|why|how|what|who|which|colour|centre|realise|organise|analyse|a|an|be|do|go|get|make|take|come|see|know|think|feel|work|play|run|walk|talk|look|find|give|say|tell|ask|help|use|try|want|need|like|love|hate|good|bad|big|small|new|old|young|beautiful|ugly|not|yes|no|today|tomorrow|yesterday)\b/gi
            }
        };
        
        let scores = {};
        
        for (const [lang, pattern] of Object.entries(patterns)) {
            scores[lang] = 0;
            
            // Character-based scoring
            const charMatches = text.match(pattern.chars) || [];
            scores[lang] += charMatches.length * 3;
            
            // Word-based scoring
            const wordMatches = text.match(pattern.words) || [];
            scores[lang] += wordMatches.length * 2;
        }
        
        const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        
        console.log('Language detection scores:', scores);
        console.log('Detected language:', detectedLang);
        
        // Return default if no matches found
        if (scores[detectedLang] === 0) {
            return 'en-US';
        }
        
        return detectedLang;
    }

    // Validate language match - ENHANCED VERSION
    validateLanguageMatch(text, selectedLanguage) {
        const detectedLanguage = this.detectLanguage(text);
        
        // Language mapping for variants
        const languageMapping = {
            'de': 'de-DE',
            'de-DE': 'de-DE',
            'german': 'de-DE',
            'deutsch': 'de-DE',
            'en': 'en-US',
            'en-US': 'en-US',
            'en-GB': 'en-GB',
            'english': 'en-US',
            'fr': 'fr',
            'french': 'fr',
            'français': 'fr',
            'es': 'es',
            'spanish': 'es',
            'español': 'es',
            'nl': 'nl',
            'dutch': 'nl',
            'nederlands': 'nl'
        };
        
        const normalizedSelected = languageMapping[selectedLanguage.toLowerCase()] || selectedLanguage;
        const normalizedDetected = languageMapping[detectedLanguage.toLowerCase()] || detectedLanguage;
        
        console.log('Language validation:', {
            original: { selected: selectedLanguage, detected: detectedLanguage },
            normalized: { selected: normalizedSelected, detected: normalizedDetected }
        });
        
        // English variants are considered compatible
        if ((normalizedSelected === 'en-US' || normalizedSelected === 'en-GB') && 
            (normalizedDetected === 'en-US' || normalizedDetected === 'en-GB')) {
            return { 
                isMatch: true, 
                detectedLanguage: normalizedDetected, 
                selectedLanguage: normalizedSelected,
                confidence: this.getLanguageConfidence(text, normalizedDetected)
            };
        }
        
        const isMatch = normalizedDetected === normalizedSelected;
        
        return {
            isMatch,
            detectedLanguage: normalizedDetected,
            selectedLanguage: normalizedSelected,
            confidence: this.getLanguageConfidence(text, normalizedDetected)
        };
    }

    // Get confidence level for language detection
    getLanguageConfidence(text, language) {
        const wordCount = text.split(/\s+/).length;
        const baseConfidence = Math.min(wordCount / 10, 1);
        
        // Adjust confidence based on text characteristics
        if (language === 'de-DE' && /[äöüßÄÖÜ]/.test(text)) {
            return Math.min(baseConfidence + 0.3, 1);
        }
        if (language === 'fr' && /[àâäéèêëïîôöùûüÿç]/.test(text)) {
            return Math.min(baseConfidence + 0.3, 1);
        }
        if (language === 'es' && /[ñáéíóúü]/.test(text)) {
            return Math.min(baseConfidence + 0.3, 1);
        }
        
        return baseConfidence;
    }

    // Main grammar check function - NO USAGE LIMITS (for authenticated users)
    async checkGrammar() {
        const text = this.textInput?.value?.trim() || '';
        const language = this.languageSelect?.value || 'en-US';

        if (!text) {
            this.showError('Please enter text to check');
            return;
        }

        if (text.length > 10000) {
            this.showError('Text is too long. Please enter up to 10,000 characters');
            return;
        }

        // Language validation - only for texts with 3+ words
        if (text.split(/\s+/).length >= 3) { 
            const languageValidation = this.validateLanguageMatch(text, language);
            
            // Only block if confidence is very high (> 0.6) and there's a clear mismatch
            if (!languageValidation.isMatch && languageValidation.confidence > 0.6) {
                const languageNames = {
                    'en-US': 'English (US)',
                    'en-GB': 'English (UK)', 
                    'de-DE': 'German',
                    'fr': 'French',
                    'es': 'Spanish',
                    'nl': 'Dutch'
                };
                
                const detectedName = languageNames[languageValidation.detectedLanguage] || languageValidation.detectedLanguage;
                const selectedName = languageNames[languageValidation.selectedLanguage] || languageValidation.selectedLanguage;
                
                // Show error and suggestion
                this.showError(`Language mismatch detected! Text appears to be in ${detectedName} but ${selectedName} was selected. Please select the correct language or change your text.`);
                this.showToast(`❌ Language mismatch: Please select ${detectedName} instead of ${selectedName}`, 'error');
                this.showLanguageSuggestion(languageValidation.detectedLanguage, detectedName);
                
                console.warn('Language mismatch detected - blocking grammar check:', {
                    detected: detectedName,
                    selected: selectedName,
                    confidence: languageValidation.confidence
                });
                
                return; // Stop grammar check
            }
        }

        this.showLoading();
        this.originalText = text;

        try {
            let result;
            try {
                result = await this.callBackendAPI(text, language);
            } catch (backendError) {
                console.warn('Backend API failed, falling back to direct LanguageTool:', backendError);
                result = await this.callLanguageToolDirectly(text, language);
            }
            
            // Show success message (no usage count needed for authenticated users)
            this.showToast('✅ Grammar check completed!', 'success');
            
            this.processResults(result);
        } catch (error) {
            console.error('Grammar check error:', error);
            this.showError('Unable to connect to grammar checking service. Please try again later.');
        } finally {
            this.hideLoading();
        }
    }

    // Show language suggestion with action buttons
    showLanguageSuggestion(detectedLanguageCode, detectedLanguageName) {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.id = 'languageSuggestion';
        suggestionDiv.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            text-align: center;
            animation: slideIn 0.3s ease-out;
        `;
        
        suggestionDiv.innerHTML = `
            <p style="margin-bottom: 15px; color: #856404; font-weight: 500;">
                💡 Would you like to change the language to ${detectedLanguageName}?
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.grammarChecker.changeLanguage('${detectedLanguageCode}')" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                    ✅ Yes, change to ${detectedLanguageName}
                </button>
                <button onclick="window.grammarChecker.dismissLanguageSuggestion()" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#545b62'" onmouseout="this.style.background='#6c757d'">
                    ❌ No, keep current
                </button>
            </div>
        `;
        
        // Remove old suggestion if exists
        const oldSuggestion = document.getElementById('languageSuggestion');
        if (oldSuggestion) oldSuggestion.remove();
        
        // Add new suggestion
        if (this.highlightedText && this.highlightedText.parentNode) {
            this.highlightedText.parentNode.appendChild(suggestionDiv);
        }
    }

    // Change language and auto-recheck
    changeLanguage(languageCode) {
        if (this.languageSelect) {
            this.languageSelect.value = languageCode;
            this.showToast(`✅ Language changed successfully!`, 'success');
            this.dismissLanguageSuggestion();
            
            // Auto-check grammar after language change
            setTimeout(() => {
                this.checkGrammar();
            }, 500);
        }
    }

    // Dismiss language suggestion
    dismissLanguageSuggestion() {
        const suggestion = document.getElementById('languageSuggestion');
        if (suggestion) {
            suggestion.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => suggestion.remove(), 300);
        }
    }

    // Backend API call
    async callBackendAPI(text, language) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Session-ID': this.getSessionId()
        };

        // Add auth token for authenticated users
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('http://localhost:3000/api/grammar/check', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ text, language })
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            if (result.error && result.error.includes('Language mismatch')) {
                throw new Error(result.error);
            }
            throw new Error(result.error || 'Grammar check failed');
        }

        return result.data;
    }

    // Direct LanguageTool API call (fallback)
    async callLanguageToolDirectly(text, language) {
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

        const data = await response.json();
        
        // Process data to get only the best suggestion
        const processedMatches = (data.matches || []).map(match => ({
            ...match,
            replacements: match.replacements && match.replacements.length > 0 
                ? [match.replacements[0]]
                : []
        }));

        return {
            matches: processedMatches,
            language: { name: 'Unknown' }
        };
    }

    // Process grammar check results
    processResults(result) {
        this.currentMatches = result.matches || [];
        if (this.errorCount) this.errorCount.textContent = this.currentMatches.length;

        if (this.currentMatches.length === 0) {
            this.showSuccess();
            if (this.suggestionsPanel) this.suggestionsPanel.classList.add('hidden');
            return;
        }

        this.highlightErrors();
        this.displaySuggestions();
    }

    // Highlight errors in text
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

        if (this.highlightedText) {
            this.highlightedText.innerHTML = highlightedHTML.replace(/\n/g, '<br>');

            this.highlightedText.querySelectorAll('.error-highlight').forEach(span => {
                span.addEventListener('click', (e) => {
                    const matchIndex = parseInt(e.target.dataset.matchIndex);
                    this.scrollToSuggestion(matchIndex);
                });
            });
        }
    }

    // Display suggestions panel
    displaySuggestions() {
        const suggestionsHTML = this.currentMatches.map((match, index) => {
            const errorText = this.originalText.substring(match.offset, match.offset + match.length);
            const bestReplacement = match.replacements && match.replacements.length > 0 
                ? match.replacements[0] 
                : null;

            return `
                <div class="suggestion-item" data-match-index="${index}">
                    <div class="suggestion-error">
                        <strong>❌ Error:</strong> "${errorText}"
                    </div>
                    <div class="suggestion-message">
                        <strong>Issue:</strong> ${match.message}
                    </div>
                    ${bestReplacement ? `
                        <div class="suggestion-fixes">
                            <strong>✅ Best Fix:</strong>
                            <span class="suggestion-fix best-suggestion" data-replacement="${bestReplacement.value}" data-match-index="${index}">
                                "${bestReplacement.value}"
                            </span>
                            <button class="apply-btn" data-match-index="${index}" data-replacement="${bestReplacement.value}">
                                Apply Fix
                            </button>
                        </div>
                    ` : `
                        <div class="suggestion-fixes">
                            <span class="no-suggestion">No suggestion available</span>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        if (this.suggestionsPanel) {
            this.suggestionsPanel.innerHTML = suggestionsHTML;
            this.suggestionsPanel.classList.remove('hidden');

            // Bind click events for apply buttons
            this.suggestionsPanel.querySelectorAll('.apply-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const matchIndex = parseInt(btn.dataset.matchIndex);
                    const replacement = btn.dataset.replacement;
                    this.applySuggestion(matchIndex, replacement);
                });
            });

            // Bind click events for suggestion fixes
            this.suggestionsPanel.querySelectorAll('.suggestion-fix').forEach(fix => {
                fix.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const matchIndex = parseInt(fix.dataset.matchIndex);
                    const replacement = fix.dataset.replacement;
                    this.applySuggestion(matchIndex, replacement);
                });
            });
        }
    }

    // Apply suggestion to text
    applySuggestion(matchIndex, replacement) {
        console.log('Applying suggestion:', { matchIndex, replacement });
        
        if (!this.currentMatches[matchIndex]) {
            console.error('Match not found at index:', matchIndex);
            return;
        }

        const match = this.currentMatches[matchIndex];
        const currentText = this.textInput.value;

        const before = currentText.substring(0, match.offset);
        const after = currentText.substring(match.offset + match.length);

        // Apply the change
        this.textInput.value = before + replacement + after;
        this.updateStats();

        // Update offsets of other matches
        const lengthDiff = replacement.length - match.length;
        this.currentMatches = this.currentMatches.filter((_, index) => index !== matchIndex)
            .map(m => {
                if (m.offset > match.offset) {
                    return { ...m, offset: m.offset + lengthDiff };
                }
                return m;
            });

        // Update UI
        if (this.errorCount) this.errorCount.textContent = this.currentMatches.length;
        
        if (this.currentMatches.length === 0) {
            this.showSuccess();
            if (this.suggestionsPanel) this.suggestionsPanel.classList.add('hidden');
        } else {
            this.originalText = this.textInput.value;
            this.highlightErrors();
            this.displaySuggestions();
        }

        this.showToast('✅ Suggestion applied successfully!');
    }

    // Scroll to specific suggestion
    scrollToSuggestion(matchIndex) {
        if (this.suggestionsPanel) {
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

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#ff9800'
        };
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-weight: 500;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Utility functions
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

// Navigation functions
function showSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
        settingsPanel.classList.add('active');
    }
}

function closeSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
        settingsPanel.classList.remove('active');
    }
}

function showLogoutModal() {
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
        logoutModal.classList.add('active');
    }
}

function closeLogoutModal() {
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
        logoutModal.classList.remove('active');
    }
}

function confirmLogout() {
    // Clear all authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userSettings');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('sessionId');
    window.location.href = 'introduction.html';
}

function showHistoryModal() {
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.classList.add('active');
    }
}

function closeHistoryModal() {
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.classList.remove('active');
    }
}

function clearHistory() {
    const historyList = document.getElementById('modalHistoryList');
    if (historyList) {
        historyList.innerHTML = '<p style="text-align: center; color: #666;">History cleared successfully!</p>';
        setTimeout(() => {
            historyList.innerHTML = '';
        }, 2000);
    }
}

function triggerAvatarInput() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.click();
    }
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewAvatar = document.getElementById('previewAvatar');
            if (previewAvatar) {
                previewAvatar.src = e.target.result;
                localStorage.setItem('userAvatar', e.target.result);
                
                // Show success message
                if (window.grammarChecker) {
                    window.grammarChecker.showToast('✅ Avatar updated successfully!');
                }
            }
        };
        reader.readAsDataURL(file);
    }
}

function showUploadForm() {
    const uploadForm = document.getElementById('uploadFormContainer');
    if (uploadForm) {
        uploadForm.classList.add('active');
    }
}

function closeUploadForm() {
    const uploadForm = document.getElementById('uploadFormContainer');
    if (uploadForm) {
        uploadForm.classList.remove('active');
    }
}

function uploadDocument() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.docx,.pdf';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('File size must be less than 10MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.value = event.target.result;
                    if (window.grammarChecker) {
                        window.grammarChecker.updateStats();
                        window.grammarChecker.showToast('✅ Document uploaded successfully!');
                    }
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
    closeUploadForm();
}

function saveUserSettings() {
    const username = document.getElementById('settingUsername')?.value || '';
    const email = document.getElementById('settingEmail')?.value || '';
    const phone = document.getElementById('settingPhone')?.value || '';
    
    // Basic validation
    if (email && !isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    if (phone && !isValidPhone(phone)) {
        alert('Please enter a valid phone number');
        return;
    }
    
    const userSettings = {
        username,
        email,
        phone,
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    
    if (window.grammarChecker) {
        window.grammarChecker.showToast('✅ Settings saved successfully!');
    }
    
    closeSettingsPanel();
}

// Validation helpers
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Language loading function
async function loadLanguages() {
    try {
        const response = await fetch('http://localhost:3000/api/grammar/languages');
        const data = await response.json();
        const languageSelect = document.getElementById('languageSelect');
        
        if (languageSelect && data.success) {
            languageSelect.innerHTML = '';
            data.data.languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = `${lang.flag} ${lang.name}`;
                languageSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.log('Failed to load languages from backend, using defaults');
        // Fallback languages
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && languageSelect.children.length === 0) {
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
                languageSelect.appendChild(option);
            });
        }
    }
}

// Authentication check for logged-in users
function checkAuthStatus() {
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('loggedInUser');
    const username = localStorage.getItem('username') || JSON.parse(localStorage.getItem('userSettings') || '{}').username || 'User';
    
    // Redirect to login if not authenticated
    if (!authToken) {
        window.location.href = 'introduction.html';
        return;
    }
    
    const userDisplay = document.querySelector('.user-display');
    if (userDisplay) {
        userDisplay.textContent = `Welcome, ${username}`;
    }
    
    // Show authenticated user elements
    const authRequiredElements = document.querySelectorAll('.auth-required');
    authRequiredElements.forEach(el => el.style.display = 'block');
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first - redirect if not logged in
    checkAuthStatus();
    
    // Initialize grammar checker
    window.grammarChecker = new GrammarChecker();
    
    // Load saved avatar
    const savedAvatar = localStorage.getItem('userAvatar');
    const previewAvatar = document.getElementById('previewAvatar');
    if (savedAvatar && previewAvatar) {
        previewAvatar.src = savedAvatar;
    }
    
    // Load languages
    loadLanguages();
    
    // Sample texts for testing different languages
    const sampleTexts = [
        "This is an example text with some grammar mistakes that need to be fixed.",
        "I have went to the store yesterday and buyed some groceries.",
        "She don't know how to swimming very good.",
        "The weather is very nice today, isn't it?",
        "Their going to they're house to get there things.",
        "Das ist ein Beispieltext mit einigen Grammatikfehlern die behoben werden müssen.", // German
        "Je suis aller au magasin hier et j'ai acheter des provisions.", // French
        "Yo he ido a la tienda ayer y comprado comestibles.", // Spanish
        "Ik ben gisteren naar de winkel gegaan en heb boodschappen gekocht." // Dutch
    ];

    // Add sample text button
    const controlsElement = document.querySelector('.controls');
    if (controlsElement) {
        const sampleBtn = document.createElement('button');
        sampleBtn.textContent = '📝 Sample Text';
        sampleBtn.className = 'check-btn';
        sampleBtn.style.cssText = `
            background: #6b7280;
            margin-left: 0.5rem;
            transition: background 0.2s;
        `;
        sampleBtn.addEventListener('mouseover', () => {
            sampleBtn.style.background = '#4b5563';
        });
        sampleBtn.addEventListener('mouseout', () => {
            sampleBtn.style.background = '#6b7280';
        });
        sampleBtn.addEventListener('click', () => {
            const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.value = randomText;
                window.grammarChecker.updateStats();
                window.grammarChecker.showToast('📝 Sample text loaded!', 'info');
            }
        });
        controlsElement.appendChild(sampleBtn);
    }
    
    // Auto-save settings when user types
    const settingsInputs = ['settingUsername', 'settingEmail', 'settingPhone'];
    settingsInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', debounce(saveUserSettings, 1000));
        }
    });

    // Show welcome message for authenticated users
    setTimeout(() => {
        const userData = JSON.parse(localStorage.getItem('userSettings') || '{}');
        const username = userData.username || 'User';
        window.grammarChecker.showToast(`🎉 Welcome back, ${username}! Unlimited grammar checks available.`, 'success');
    }, 1000);

    // Add smooth scroll behavior to navigation
    document.querySelectorAll('.nav-menu a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
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
});

// Service Worker registration
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

// Handle page visibility change to save state
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        const textInput = document.getElementById('textInput');
        if (textInput && textInput.value) {
            localStorage.setItem('lastGrammarText', textInput.value);
        }
    } else {
        const lastText = localStorage.getItem('lastGrammarText');
        const textInput = document.getElementById('textInput');
        if (lastText && textInput && !textInput.value) {
            textInput.value = lastText;
            if (window.grammarChecker) {
                window.grammarChecker.updateStats();
            }
        }
    }
});

// Handle browser back/forward navigation
window.addEventListener('popstate', (event) => {
    const textInput = document.getElementById('textInput');
    if (textInput && textInput.value) {
        localStorage.setItem('lastGrammarText', textInput.value);
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to check grammar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (window.grammarChecker && window.grammarChecker.checkBtn && !window.grammarChecker.checkBtn.disabled) {
            window.grammarChecker.checkGrammar();
        }
    }
    
    // Escape to close modals and suggestions
    if (e.key === 'Escape') {
        closeSettingsPanel();
        closeLogoutModal();
        closeHistoryModal();
        closeUploadForm();
        if (window.grammarChecker) {
            window.grammarChecker.dismissLanguageSuggestion();
        }
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-20px); opacity: 0; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .error-highlight {
        background-color: #ffebee;
        border-bottom: 2px solid #f44336;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .error-highlight:hover {
        background-color: #ffcdd2;
    }
    
    .suggestion-item {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        background: #fafafa;
        transition: box-shadow 0.2s;
    }
    
    .suggestion-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .apply-btn {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 8px;
        transition: background 0.2s;
    }
    
    .apply-btn:hover {
        background: #45a049;
    }
    
    .suggestion-fix {
        background: #e8f5e8;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .suggestion-fix:hover {
        background: #d4edda;
    }
    
    .success-message {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        margin: 15px 0;
    }
    
    .error-message {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        margin: 15px 0;
    }
`;
document.head.appendChild(style);

// Export functions for HTML onclick handlers
window.showSettingsPanel = showSettingsPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.showLogoutModal = showLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.showHistoryModal = showHistoryModal;
window.closeHistoryModal = closeHistoryModal;
window.clearHistory = clearHistory;
window.triggerAvatarInput = triggerAvatarInput;
window.previewAvatar = previewAvatar;
window.showUploadForm = showUploadForm;
window.closeUploadForm = closeUploadForm;
window.uploadDocument = uploadDocument;
window.saveUserSettings = saveUserSettings;

// Debug helpers for testing language detection
window.testLanguageDetection = (text, selectedLang) => {
    if (window.grammarChecker) {
        const result = window.grammarChecker.validateLanguageMatch(text, selectedLang);
        console.log('Language detection result:', result);
        return result;
    }
};

window.simulateLanguageMismatch = () => {
    const textInput = document.getElementById('textInput');
    const languageSelect = document.getElementById('languageSelect');
    if (textInput && languageSelect) {
        textInput.value = "Das ist ein deutscher Text mit Grammatikfehlern.";
        languageSelect.value = "en-US";
        window.grammarChecker.updateStats();
        console.log('Language mismatch simulation set up. Click "Check Grammar" to test.');
    }
};