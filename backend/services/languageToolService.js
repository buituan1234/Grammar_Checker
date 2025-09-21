import fetch from 'node-fetch';

// Custom error class for LanguageTool API issues
class LanguageToolError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'LanguageToolError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

class LanguageToolService {
  constructor() {
    this.baseURL = process.env.LANGUAGETOOL_API_URL || 'https://api.languagetool.org/v2';
    this.timeout = parseInt(process.env.API_TIMEOUT) || 10000;

    // In-memory cache for grammar results
    this.grammarCache = new Map();
    this.grammarCacheTimeout = 5 * 60 * 1000; // 5 minutes

    this.languagesCache = null;
    this.languagesCacheTimestamp = 0;
    this.languagesCacheTimeout = 60 * 60 * 1000; // 1 hour

    // Clear expired cache periodically
    setInterval(() => this.clearExpiredGrammarCache(), this.grammarCacheTimeout);
  }

  async detectLanguage(text) {
    const params = new URLSearchParams({ text, language: 'auto' });

    try {
      const response = await fetch(`${this.baseURL}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new LanguageToolError(`Language detection failed: ${response.statusText}`, response.status, errorText);
      }

      const data = await response.json();
      const detectedCode = data.language?.detectedLanguage?.code;

      if (!detectedCode || typeof detectedCode !== 'string') {
        throw new LanguageToolError('No valid detected language returned by LanguageTool.', 500);
      }

      return detectedCode;
    } catch (error) {
      if (error instanceof LanguageToolError) throw error;
      throw new LanguageToolError(`Language detection failed: ${error.message}`, error.statusCode || 500, error.details || error.stack);
    }
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  setGrammarCache(key, value) {
    this.grammarCache.set(key, { data: value, timestamp: Date.now() });
  }

  getFromGrammarCache(key) {
    const cached = this.grammarCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.grammarCacheTimeout) {
      this.grammarCache.delete(key);
      return null;
    }
    return cached.data;
  }

  clearExpiredGrammarCache() {
    const now = Date.now();
    for (const [key, value] of this.grammarCache.entries()) {
      if (now - value.timestamp > this.grammarCacheTimeout) {
        this.grammarCache.delete(key);
      }
    }
  }

  async getLanguages() {
    const now = Date.now();
    if (this.languagesCache && (now - this.languagesCacheTimestamp < this.languagesCacheTimeout)) {
      return this.languagesCache;
    }

    try {
      const response = await fetch(`${this.baseURL}/languages`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new LanguageToolError(`Failed to fetch languages: ${response.statusText}`, response.status, errorBody);
      }
      const data = await response.json();
      this.languagesCache = data;
      this.languagesCacheTimestamp = now;
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new LanguageToolError('LanguageTool API request timed out.', 408);
      }
      if (error instanceof LanguageToolError) throw error;
      throw new LanguageToolError(`Network error or LanguageTool API is unreachable: ${error.message}`, 503);
    }
  }

  async checkGrammar(text, language = 'auto') {
    const cacheKey = this._hashString(`${text}-${language}`);
    const cachedResult = this.getFromGrammarCache(cacheKey);
    if (cachedResult) {
      console.log('⚡ [CACHE HIT] Grammar check result returned from cache.');
      return cachedResult;
    }

    const params = new URLSearchParams({ language, text });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new LanguageToolError(`LanguageTool API error: ${response.statusText}`, response.status, errorBody);
      }

      const data = await response.json();
      if (!data.matches) {
        throw new LanguageToolError('Response did not contain "matches".', 500, data);
      }

      this.setGrammarCache(cacheKey, data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new LanguageToolError('LanguageTool API request timed out.', 408);
      }
      if (error instanceof LanguageToolError) throw error;
      throw new LanguageToolError(`Network error or LanguageTool API is unreachable: ${error.message}`, 503);
    }
  }
}

// ✅ Improved: Validate Cohere suggestions by checking that the same error is not repeated in the same position
async function validateCohereSuggestions(text, cohereMatches) {
  const validateTasks = cohereMatches.map(async (match) => {
    const replacement = match.replacements?.[0]?.value;
    if (!replacement) return null;

    const updatedText = text.slice(0, match.offset) + replacement + text.slice(match.offset + match.length);

    try {
      const result = await languageToolService.checkGrammar(updatedText, 'en');

      const sameError = result.matches.some(m => m.offset === match.offset && m.length === match.length);
      return !sameError ? match : null;
    } catch (err) {
      console.warn('⚠️ LanguageTool validation failed:', err.message);
      return null;
    }
  });

  const validated = await Promise.all(validateTasks);
  console.log(`✅ LT validation accepted ${validated.filter(Boolean).length}/${cohereMatches.length} suggestions.`);
  return validated.filter(Boolean);
}

const languageToolService = new LanguageToolService();
languageToolService.validateCohereSuggestions = validateCohereSuggestions;

export default languageToolService;
