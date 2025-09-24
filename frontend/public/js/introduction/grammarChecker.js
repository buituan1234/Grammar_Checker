// grammarChecker.js - Logic kiểm tra ngữ pháp demo

// Mock grammar errors for demo
const DEMO_ERRORS = [
    {
        pattern: /there house/gi,
        message: "Did you mean 'their house'?",
        original: "there house",
        suggestion: "their house",
        type: "Grammar"
    },
    {
        pattern: /alot/gi,
        message: "Did you mean 'a lot'?",
        original: "alot",
        suggestion: "a lot", 
        type: "Spelling"
    },
    {
        pattern: /your welcome/gi,
        message: "Did you mean 'you're welcome'?",
        original: "your welcome",
        suggestion: "you're welcome",
        type: "Grammar"
    }
];

// Find errors in text
function findErrors(text) {
    const errors = [];
    
    // Check for predefined errors
    DEMO_ERRORS.forEach(errorDef => {
        const matches = [...text.matchAll(errorDef.pattern)];
        matches.forEach(match => {
            errors.push({
                message: errorDef.message,
                original: errorDef.original,
                suggestion: errorDef.suggestion,
                type: errorDef.type,
                offset: match.index
            });
        });
    });
    
    // Check for missing capitals at sentence start
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    sentences.forEach((sentence, index) => {
        const trimmed = sentence.trim();
        if (trimmed && trimmed[0] !== trimmed[0].toUpperCase()) {
            errors.push({
                message: "Sentence should start with a capital letter",
                original: trimmed[0],
                suggestion: trimmed[0].toUpperCase(),
                type: "Capitalization",
                offset: text.indexOf(trimmed)
            });
        }
    });
    
    return errors;
}

// Simulate API call for grammar checking
export async function performDemoGrammarCheck(text, language) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockErrors = findErrors(text);
    
    return {
        success: true,
        data: {
            matches: mockErrors,
            text: text
        }
    };
}

// Update text statistics
export function updateTextStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    const wordCountEl = document.getElementById('demoWordCount');
    const charCountEl = document.getElementById('demoCharCount');
    
    if (wordCountEl) wordCountEl.textContent = words;
    if (charCountEl) charCountEl.textContent = chars;
    
    return { words, chars };
}

// Display grammar check results
export function displayResults(matches, container) {
    if (!container) return;
    
    if (matches.length === 0) {
        container.innerHTML = `
            <div class="demo-no-errors">
                🎉 Great! No grammar issues found in your text.
            </div>
        `;
    } else {
        container.innerHTML = matches.map((match, index) => `
            <div class="demo-error-item">
                <div class="demo-error-type">${match.type || 'Grammar'}</div>
                <div class="demo-error-message"><strong>Issue:</strong> ${match.message}</div>
                <div class="demo-suggestion">
                    <strong>Original:</strong> <span style="background: #ffebee; padding: 2px 6px; border-radius: 3px; color: #c62828;">"${match.original}"</span> → 
                    <strong>Suggestion:</strong> <span style="background: #e8f5e8; padding: 2px 6px; border-radius: 3px; color: #2e7d32;">"${match.suggestion}"</span>
                </div>
            </div>
        `).join('');
    }
}