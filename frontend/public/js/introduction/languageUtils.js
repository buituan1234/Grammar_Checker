// languageUtils.js - Xử lý phát hiện và validate ngôn ngữ

// Language detection patterns
const LANGUAGE_PATTERNS = {
    'de-DE': /[äöüßÄÖÜ]|ich|der|die|das|und|ist|sind/gi,
    'fr': /[àâäéèêëïîôöùûüÿç]|je|le|la|les|et|est|sont/gi,
    'es': /[ñáéíóúü]|el|la|los|las|y|es|son/gi,
    'nl': /ij|zij|wij|de|het|en|is|zijn/gi
};

// Language names mapping
export const LANGUAGE_NAMES = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)', 
    'de-DE': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'nl': 'Dutch'
};

// Detect language based on text content
export function detectLanguage(text) {
    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
        if (pattern.test(text)) {
            return lang;
        }
    }
    return 'en-US';
}

// Validate if text matches selected language
export function validateLanguageMatch(text, selectedLanguage) {
    const detectedLanguage = detectLanguage(text);
    
    // Handle English variants
    if ((selectedLanguage === 'en-US' || selectedLanguage === 'en-GB') && 
        (detectedLanguage === 'en-US' || detectedLanguage === 'en-GB')) {
        return true;
    }
    
    return detectedLanguage === selectedLanguage;
}