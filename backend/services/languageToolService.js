import fetch from 'node-fetch';
import { getLanguageDetectionService } from './languageDetectionService.js';

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
    this.baseURL = process.env.LANGUAGETOOL_API_URL || 'http://localhost:8081/v2';
    this.timeout = parseInt(process.env.API_TIMEOUT) || 10000;

    // In-memory cache for grammar results
    this.grammarCache = new Map();
    this.grammarCacheTimeout = 5 * 60 * 1000; // 5 minutes

    this.languagesCache = null;
    this.languagesCacheTimestamp = 0;
    this.languagesCacheTimeout = 60 * 60 * 1000; // 1 hour

    // Language detection service
    this.languageDetectionService = null;
    this.initLanguageDetection();

    // Clear expired cache periodically
    setInterval(() => this.clearExpiredGrammarCache(), this.grammarCacheTimeout);
  }

  // Initialize language detection service (non-blocking)
  async initLanguageDetection() {
    try {
      this.languageDetectionService = await getLanguageDetectionService({
        logLevel: 'info',
        cacheTimeout: 10 * 60 * 1000, // 10 minutes cache
        fallbackLanguage: 'en-US'
      });
      console.log('✅ LanguageTool Service with CLD3 language detection ready');
    } catch (error) {
      console.warn('⚠️ Failed to initialize language detection service, will use LanguageTool fallback:', error.message);
    }
  }

  // Enhanced language detection with CLD3 + LanguageTool fallback
  async detectLanguage(text) {
    // Try CLD3 first (faster and more accurate)
    if (this.languageDetectionService) {
      try {
        const result = await this.languageDetectionService.detectLanguage(text);
        
        // Return the LanguageTool compatible code
        return {
          language: result.languagetool_code,
          confidence: result.confidence,
          reliable: result.reliable,
          source: result.source,
          detection_time_ms: result.detection_time_ms
        };
      } catch (error) {
        console.warn('⚠️ CLD3 detection failed, falling back to LanguageTool:', error.message);
      }
    }

    // Fallback to LanguageTool's built-in detection
    return this.detectLanguageWithLanguageTool(text);
  }

  // Original LanguageTool language detection (fallback)
  async detectLanguageWithLanguageTool(text) {
    const params = new URLSearchParams({ text, language: 'auto' });

    try {
      const startTime = Date.now();
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
      const detectionTime = Date.now() - startTime;

      if (!detectedCode || typeof detectedCode !== 'string') {
        throw new LanguageToolError('No valid detected language returned by LanguageTool.', 500);
      }

      return {
        language: detectedCode,
        confidence: data.language?.detectedLanguage?.confidence || 0.5,
        reliable: true, // LanguageTool is generally reliable
        source: 'languagetool-fallback',
        detection_time_ms: detectionTime
      };

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

  // Enhanced grammar check with improved language detection
  async checkGrammar(text, language = 'auto', options = {}) {
    const cacheKey = this._hashString(`${text}-${language}`);
    const cachedResult = this.getFromGrammarCache(cacheKey);
    if (cachedResult) {
      console.log('⚡ [CACHE HIT] Grammar check result returned from cache.');
      return cachedResult;
    }

    let detectionInfo = null;
    let finalLanguage = language;

    // Auto-detect language if requested
    if (language === 'auto') {
      try {
        const detection = await this.detectLanguage(text);
        finalLanguage = detection.language;
        detectionInfo = detection;
        
        console.log(`🔍 Auto-detected language: ${finalLanguage} (${detection.source}, ${detection.detection_time_ms}ms)`);
      } catch (error) {
        console.warn('⚠️ Language detection failed, using English as fallback:', error.message);
        finalLanguage = 'en-US';
        detectionInfo = {
          language: 'en-US',
          confidence: 0.5,
          reliable: false,
          source: 'error-fallback',
          error: error.message
        };
      }
    }

    const params = new URLSearchParams({ language: finalLanguage, text });

    // Add additional options if provided
    if (options.enabledOnly) params.append('enabledOnly', options.enabledOnly);
    if (options.level) params.append('level', options.level);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const startTime = Date.now();
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
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new LanguageToolError(`LanguageTool API error: ${response.statusText}`, response.status, errorBody);
      }

      const data = await response.json();
      if (!data.matches) {
        throw new LanguageToolError('Response did not contain "matches".', 500, data);
      }

      // Enhanced response with detection info and performance metrics
      const enhancedData = {
        ...data,
        performance: {
          response_time_ms: responseTime,
          cached: false
        }
      };

      // Add language detection info if auto-detection was used
      if (detectionInfo) {
        enhancedData.language_detection = {
          detected_language: detectionInfo.language,
          confidence: detectionInfo.confidence,
          reliable: detectionInfo.reliable,
          source: detectionInfo.source,
          detection_time_ms: detectionInfo.detection_time_ms
        };
      }

      this.setGrammarCache(cacheKey, enhancedData);
      
      console.log(`✅ Grammar check completed in ${responseTime}ms (${data.matches.length} issues found)`);
      return enhancedData;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new LanguageToolError('LanguageTool API request timed out.', 408);
      }
      if (error instanceof LanguageToolError) throw error;
      throw new LanguageToolError(`Network error or LanguageTool API is unreachable: ${error.message}`, 503);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      // Check LanguageTool API
      const response = await fetch(`${this.baseURL}/languages`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      // Check language detection service
      let languageDetectionStatus = 'not-available';
      if (this.languageDetectionService) {
        const ldHealth = await this.languageDetectionService.healthCheck();
        languageDetectionStatus = ldHealth.status;
      }
      
      return {
        status: 'healthy',
        services: {
          languagetool_api: response.ok,
          language_detection: languageDetectionStatus
        },
        caches: {
          grammar_cache_size: this.grammarCache.size,
          languages_cached: this.languagesCache ? 'yes' : 'no'
        },
        config: {
          base_url: this.baseURL,
          timeout_ms: this.timeout
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        services: {
          languagetool_api: false,
          language_detection: this.languageDetectionService ? 'unknown' : 'not-available'
        }
      };
    }
  }

  // Get language detection service stats
  getLanguageDetectionStats() {
    if (!this.languageDetectionService) {
      return { available: false };
    }
    
    return {
      available: true,
      ...this.languageDetectionService.getCacheStats()
    };
  }
}

// Validate Cohere suggestions (unchanged)
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