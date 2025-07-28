
const axios = require('axios');
class LanguageToolService {
  constructor() {
    this.baseURL = 'https://languagetool.org/api/v2/check';
  }

  /**
   * Get the best suggestion for a grammar error using AI-like scoring
   * @param {Object} match - The grammar error match from LanguageTool
   * @returns {Object|null} - The best replacement suggestion
   */
  getBestSuggestion(match) {
    const replacements = match.replacements;
    if (!replacements || replacements.length === 0) return null;

    // Context analysis
    const context = match.context?.text || '';
    const errorOffset = match.context?.offset || 0;
    const errorLength = match.context?.length || 0;
    const ruleId = match.rule?.id || '';
    const category = match.rule?.category?.name || '';
    
    // Score each replacement
    const scoredReplacements = replacements.map(replacement => {
      let score = 0;
      const suggestion = replacement.value;
      
      // 1. Length preference (shorter is often better)
      score += Math.max(0, 10 - suggestion.length * 0.5);
      
      // 2. Common word bonus
      const commonWords = [
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can',
        'and', 'or', 'but', 'so', 'because', 'if', 'when', 'where', 'how'
      ];
      if (commonWords.includes(suggestion.toLowerCase())) {
        score += 8;
      }
      
      // 3. Capitalization matching
      const originalText = context.substring(errorOffset, errorOffset + errorLength);
      if (originalText.length > 0) {
        const originalFirstChar = originalText.charAt(0);
        const suggestionFirstChar = suggestion.charAt(0);
        
        if (originalFirstChar === originalFirstChar.toUpperCase()) {
          if (suggestionFirstChar === suggestionFirstChar.toUpperCase()) {
            score += 5;
          }
        } else if (suggestionFirstChar === suggestionFirstChar.toLowerCase()) {
          score += 5;
        }
      }
      
      // 4. Rule-specific scoring
      switch (category.toLowerCase()) {
        case 'grammar':
          if (ruleId.includes('AGREEMENT')) {
            // Subject-verb agreement - prefer grammatically correct forms
            score += 10;
          }
          if (ruleId.includes('VERB_FORM')) {
            score += 8;
          }
          break;
          
        case 'spelling':
          // For spelling, first suggestion is usually correct
          if (replacements.indexOf(replacement) === 0) {
            score += 15;
          }
          break;
          
        case 'punctuation':
          // Prefer standard punctuation
          if (/^[.,;:!?]$/.test(suggestion)) {
            score += 7;
          }
          break;
          
        case 'style':
          // For style, prefer shorter alternatives
          if (suggestion.length < originalText.length) {
            score += 5;
          }
          break;
      }
      
      // 5. Frequency-based scoring (simulated)
      const frequencyMap = {
        // Common corrections
        'its': 10, "it's": 8,
        'there': 9, 'their': 9, "they're": 7,
        'your': 8, "you're": 7,
        'too': 8, 'to': 9, 'two': 6,
        'then': 8, 'than': 8,
        'effect': 7, 'affect': 7,
        'lose': 7, 'loose': 6,
        'accept': 7, 'except': 6
      };
      
      if (frequencyMap[suggestion.toLowerCase()]) {
        score += frequencyMap[suggestion.toLowerCase()];
      }
      
      // 6. Penalty for unusual characters or formatting
      if (/[^\w\s.,;:!?'-]/.test(suggestion)) {
        score -= 5;
      }
      
      // 7. Bonus for preserving sentence structure
      if (suggestion.includes(' ') === originalText.includes(' ')) {
        score += 3;
      }
      
      return {
        ...replacement,
        score: Math.max(0, score),
        confidence: this.calculateConfidence(score, replacements.length)
      };
    });
    
    // Return the highest scored replacement
    const bestSuggestion = scoredReplacements.sort((a, b) => b.score - a.score)[0];
    
    return bestSuggestion;
  }

  /**
   * Calculate confidence level for a suggestion
   * @param {number} score - The calculated score
   * @param {number} totalOptions - Total number of replacement options
   * @returns {string} - Confidence level
   */
  calculateConfidence(score, totalOptions) {
    if (score >= 15) return 'high';
    if (score >= 8) return 'medium';
    if (score >= 3) return 'low';
    return 'very-low';
  }

  /**
   * Process matches to include only the best suggestion for each error
   * @param {Array} matches - Array of grammar error matches
   * @returns {Array} - Processed matches with single best suggestion
   */
  processMatches(matches) {
    return matches.map(match => {
      const bestSuggestion = this.getBestSuggestion(match);
      
      return {
        ...match,
        bestSuggestion: bestSuggestion,
        originalReplacements: match.replacements, // Keep original for reference
        replacements: bestSuggestion ? [bestSuggestion] : [], // Override with single best
        confidence: bestSuggestion?.confidence || 'unknown',
        processed: true
      };
    });
  }

  /**
   * Check grammar using LanguageTool API
   * @param {string} text - Text to check
   * @param {string} language - Language code
   * @returns {Promise<Object>} - Processed grammar check results
   */
  async checkGrammar(text, language = 'en-US') {
    const encodedParams = new URLSearchParams();
    encodedParams.set('language', language);
    encodedParams.set('text', text);
    encodedParams.set('enabledOnly', 'false');

    const options = {
      method: 'POST',
      url: this.baseURL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Grammar-Checker-AI/1.0'
      },
      data: encodedParams,
      timeout: 10000 // 10 second timeout
    };

    try {
      console.log(`Checking grammar for language: ${language}`);
      const response = await axios.request(options);
      
      // Process the response to include only best suggestions
      const processedData = {
        ...response.data,
        matches: this.processMatches(response.data.matches || [])
      };
      
      return processedData;
    } catch (error) {
      console.error('Error calling LanguageTool API:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
      
      // Create custom error for better handling
      const customError = new Error('LanguageTool API request failed');
      customError.name = 'LanguageToolError';
      customError.originalError = error;
      
      throw customError;
    }
  }

  /**
   * Categorize errors by type
   * @param {Array} matches - Array of grammar matches
   * @returns {Object} - Categorized error counts
   */
  categorizeErrors(matches) {
    const categories = {
      grammar: 0,
      spelling: 0,
      punctuation: 0,
      style: 0,
      other: 0
    };

    matches.forEach(match => {
      const category = match.rule?.category?.name?.toLowerCase() || 'other';
      
      switch (category) {
        case 'grammar':
          categories.grammar++;
          break;
        case 'spelling':
        case 'typos':
          categories.spelling++;
          break;
        case 'punctuation':
          categories.punctuation++;
          break;
        case 'style':
        case 'redundancy':
          categories.style++;
          break;
        default:
          categories.other++;
      }
    });

    return categories;
  }

  /**
   * Get supported languages
   * @returns {Array} - Array of supported language objects
   */
  getSupportedLanguages() {
    return [
      { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
      { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
      { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
    ];
  }

  /**
   * Validate language code
   * @param {string} language - Language code to validate
   * @returns {boolean} - Whether the language is supported
   */
  isLanguageSupported(language) {
    const supportedCodes = this.getSupportedLanguages().map(lang => lang.code);
    return supportedCodes.includes(language);
  }

  /**
   * Clean and prepare text for checking
   * @param {string} text - Raw text input
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remove excessive whitespace while preserving paragraph structure
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs
      .trim();
  }
}

module.exports = LanguageToolService;