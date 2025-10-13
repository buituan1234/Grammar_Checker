// backend/services/languageDetectionService.js
import cldFactory from 'cld3-asm';

// ================== SINGLETON PATTERN ==================
let languageDetectionServiceInstance = null;

export class LanguageDetectionService {
  constructor(options = {}) {
    this.cldInstance = null;
    this.initPromise = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      minBytes: options.minBytes || 20,
      maxBytes: options.maxBytes || 2000,
      enableCache: options.enableCache !== false,
      cacheTimeout: options.cacheTimeout || 10 * 60 * 1000,
      fallbackLanguage: options.fallbackLanguage || 'en-US',
      logLevel: options.logLevel || 'info'
    };
    this.detectionCache = new Map();
    
    if (this.config.enableCache) {
      setInterval(() => this.clearExpiredCache(), this.config.cacheTimeout);
    }

    this.initialize().catch(err => {
      if (this.config.logLevel === 'info') {
        console.warn('LanguageDetectionService initialization started (async).');
      }
    });
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (this.config.logLevel === 'info') {
          console.log('Initializing CLD3 Language Detection Service...');
        }
        
        const module = await cldFactory.loadModule();
        this.cldInstance = module.create(this.config.minBytes, this.config.maxBytes);
        
        this.isInitialized = true;
        
        if (this.config.logLevel === 'info') {
          console.log('CLD3 Language Detection Service ready');
        }
        
        return this.cldInstance;
      } catch (error) {
        console.error('Failed to initialize CLD3:', error);
        console.error('Available cldFactory methods:', Object.keys(cldFactory || {}));
        this.initPromise = null; 
        throw error;
      }
    })();

    return this.initPromise;
  }

  // ================== LANGUAGE MAPPING ==================
  getCLD3ToLanguageToolMapping() {
    return {
      'en': 'en-US', 'fr': 'fr', 'de': 'de', 'es': 'es', 'it': 'it',
      'pt': 'pt', 'nl': 'nl', 'ru': 'ru-RU', 'pl': 'pl-PL', 'sv': 'sv-SE',
      'da': 'da-DK', 'no': 'no', 'fi': 'fi-FI', 'is': 'is-IS',
      'cs': 'cs-CZ', 'sk': 'sk-SK', 'hu': 'hu-HU', 'ro': 'ro-RO', 'bg': 'bg-BG',
      'hr': 'hr-HR', 'sr': 'sr', 'sl': 'sl-SI', 'lv': 'lv-LV', 'lt': 'lt-LT',
      'et': 'et-EE', 'mk': 'mk-MK', 'mt': 'mt-MT',
      'ca': 'ca-ES', 'eu': 'eu', 'gl': 'gl-ES', 'cy': 'cy', 'ga': 'ga-IE',
      'br': 'br-FR', 'ast': 'ast',
      'ar': 'ar', 'he': 'he', 'fa': 'fa', 'ur': 'ur', 'ps': 'ps',
      'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'vi': 'vi-VN', 'th': 'th', 'lo': 'lo-LA',
      'km': 'km-KH', 'my': 'my-MM', 'si': 'si-LK', 'ta': 'ta-IN', 'te': 'te-IN',
      'ml': 'ml-IN', 'kn': 'kn-IN', 'hi': 'hi-IN', 'bn': 'bn-BD', 'gu': 'gu-IN',
      'pa': 'pa-IN', 'mr': 'mr-IN', 'ne': 'ne-NP', 'or': 'or-IN', 'as': 'as-IN',
      'tr': 'tr', 'az': 'az', 'kk': 'kk', 'ky': 'ky', 'uz': 'uz',
      'tg': 'tg', 'mn': 'mn', 'ka': 'ka', 'hy': 'hy', 'be': 'be',
      'uk': 'uk-UA', 'tl': 'tl-PH', 'ceb': 'ceb', 'haw': 'haw',
      'mg': 'mg', 'sm': 'sm', 'to': 'to', 'fj': 'fj'
    };
  }

  // ================== PATTERN-BASED PRE-CHECK ==================
  preCheckPatterns(text) {
    if (!text || typeof text !== 'string') return null;
    if (/[\u0400-\u04FF]{3,}/.test(text)) {
      return {
        detected_language: 'ru',
        confidence: 0.95,
        languagetool_code: 'ru-RU',
        reliable: true,
        source: 'pattern-cyrillic',
        detection_time_ms: 0
      };
    }

    if (/[\u3040-\u309F\u30A0-\u30FF]{2,}/.test(text)) {
      return {
        detected_language: 'ja',
        confidence: 0.98,
        languagetool_code: 'ja-JP',
        reliable: true,
        source: 'pattern-japanese',
        detection_time_ms: 0
      };
    }

    if (/[\u4E00-\u9FFF]{2,}/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return {
        detected_language: 'zh',
        confidence: 0.98,
        languagetool_code: 'zh-CN',
        reliable: true,
        source: 'pattern-chinese',
        detection_time_ms: 0
      };
    }

    if (/[\uAC00-\uD7AF\u1100-\u11FF]{2,}/.test(text)) {
      return {
        detected_language: 'ko',
        confidence: 0.98,
        languagetool_code: 'ko-KR',
        reliable: true,
        source: 'pattern-korean',
        detection_time_ms: 0
      };
    }

    if (/[\u0600-\u06FF\u0750-\u077F]{2,}/.test(text)) {
      return {
        detected_language: 'ar',
        confidence: 0.98,
        languagetool_code: 'ar',
        reliable: true,
        source: 'pattern-arabic',
        detection_time_ms: 0
      };
    }

    if (/[\u0E00-\u0E7F]{2,}/.test(text)) {
      return {
        detected_language: 'th',
        confidence: 0.98,
        languagetool_code: 'th',
        reliable: true,
        source: 'pattern-thai',
        detection_time_ms: 0
      };
    }

    if (/[¿¡]/.test(text)) {
      return {
        detected_language: 'es',
        confidence: 0.9,
        languagetool_code: 'es',
        reliable: true,
        source: 'pattern-spanish',
        detection_time_ms: 0
      };
    }

    if (/\b(você|está|não|também|português)\b/i.test(text)) {
      return {
        detected_language: 'pt',
        confidence: 0.88,
        languagetool_code: 'pt',
        reliable: true,
        source: 'pattern-portuguese',
        detection_time_ms: 0
      };
    }

    if (/\b(più|meno|però|anche|già|così|perché|quando|sono|fatto|molto|troppo)\b/i.test(text)) {
      return {
        detected_language: 'it',
        confidence: 0.92,
        languagetool_code: 'it',
        reliable: true,
        source: 'pattern-italian',
        detection_time_ms: 0
      };
    }

    if (/\b(der|die|das|und|ist|nicht|du|was|sind|ein|eine|mit|auf|für|den|dem|zu|von|dass|haben|wir|sie|ich)\b/i.test(text)) {
      return {
        detected_language: 'de',
        confidence: 0.95,
        languagetool_code: 'de',
        reliable: true,
        source: 'pattern-german',
        detection_time_ms: 0
      };
    }

    const englishPattern = /\b(?:the|and|is|are|was|were|have|has|had|do|does|did|will|would|can|could|not|your|my|their|they|we|I)\b/i;
    const matches = text.toLowerCase().match(new RegExp(englishPattern, 'gi')) || [];
    if (matches.length >= 2) {
      return {
        detected_language: 'en',
        confidence: 0.9,
        languagetool_code: 'en-US',
        reliable: true,
        source: 'pattern-english',
        detection_time_ms: 0
      };
    }

    return null;
  }

  // ================== MAIN DETECTION METHOD ==================
  async detectLanguage(text, options = {}) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
      }
      text = String(text).normalize('NFKC').trim();

      if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
        console.log('\n=== [LDS] LANGUAGE DETECTION DEBUG ===');
        console.log('[LDS] Input text (trimmed):', text);
        console.log('[LDS] Text length:', text.length);
        console.log('[LDS] First 10 chars:', text.slice(0, 10));
        console.log('[LDS] Char codes (first 8):', [...text.slice(0, 8)].map(c => `${c}:U+${c.charCodeAt(0).toString(16).toUpperCase()}`));
      }

      if (this.config.enableCache && !options.skipCache) {
        const cached = this.getFromCache(text);
        if (cached) {
          if (this.config.logLevel === 'info' || this.config.logLevel === 'debug') {
            console.log('[LDS] ✅ CACHE HIT - returning cached result');
            console.log('[LDS] Cached result:', JSON.stringify(cached, null, 2));
            console.log('[LDS] ===\n');
          }
          return cached;
        }
      }

      const preCheck = this.preCheckPatterns(text);
      if (preCheck) {
        if (this.config.logLevel === 'info' || this.config.logLevel === 'debug') {
          console.log('[LDS] ✅ Pattern matched! Source:', preCheck.source);
        }
        this.setCache(text, preCheck);
        return preCheck;
      }

      // === Ensure CLD3 initialised ===
      if (!this.isInitialized) {
        if (this.config.logLevel === 'info') {
          console.log('⚠️ CLD3 not initialized, initializing now...');
        }
        await this.initialize();
      }

      if (!this.cldInstance) {
        throw new Error('CLD3 not initialized');
      }

      if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
        console.log('✅ CLD3 instance ready');
        console.log('CLD3 config - minBytes:', this.config.minBytes, 'maxBytes:', this.config.maxBytes);
        console.log('Calling CLD3.findLanguage()...');
      }

      const startTime = Date.now();
      const result = this.cldInstance.findLanguage(text);
      const detectionTime = Date.now() - startTime;

      if (this.config.logLevel === 'debug') {
        console.log('=== CLD3 RAW RESULT ===');
        console.log(JSON.stringify(result, null, 2));
      }

      // === If no language recognized, fallback ===
      if (!result || !result.language) {
        if (this.config.logLevel === 'warn' || this.config.logLevel === 'info') {
          console.warn('⚠️ CLD3 returned invalid result - no language detected');
        }
        const fallbackResult = {
          detected_language: 'en',
          confidence: 0.5,
          languagetool_code: this.config.fallbackLanguage,
          reliable: false,
          source: 'fallback-no-detection',
          detection_time_ms: detectionTime,
          raw_result: result || null
        };
        this.setCache(text, fallbackResult);
        return fallbackResult;
      }

      // === Map & normalize result ===
      const mapping = this.getCLD3ToLanguageToolMapping();
      const ltCode = mapping[result.language] || this.config.fallbackLanguage;
      const confidence = Number(result.probability ?? result.confidence ?? 0);

      const detectionResult = {
        detected_language: result.language,
        confidence,
        languagetool_code: ltCode,
        reliable: result.is_reliable !== undefined ? result.is_reliable : (confidence > 0.7),
        source: 'cld3',
        detection_time_ms: detectionTime,
        raw_result: result
      };

      if (this.config.logLevel === 'info' || this.config.logLevel === 'debug') {
        console.log('=== FINAL DETECTION RESULT ===');
        console.log(JSON.stringify(detectionResult, null, 2));
      }

      if (this.config.enableCache) {
        this.setCache(text, detectionResult);
        if (this.config.logLevel === 'debug') {
          console.log('✅ Result cached');
        }
      }

      if (this.config.logLevel === 'info') {
        const reliable = detectionResult.reliable ? 'reliable' : 'unreliable';
        console.log(`Detected: ${result.language} -> ${ltCode} (${(confidence * 100).toFixed(1)}%, ${reliable}, ${detectionTime}ms)`);
      }

      return detectionResult;

    } catch (error) {
      console.error('❌ Language detection error:', error.message);
      if (error.stack) console.error(error.stack);

      const errorResult = {
        detected_language: 'en',
        confidence: 0.5,
        languagetool_code: this.config.fallbackLanguage,
        reliable: false,
        source: 'error-fallback',
        error: error.message
      };

      return errorResult;
    }
  }

  // ================== MULTIPLE LANGUAGE DETECTION ==================
  async detectMultipleLanguages(text, maxResults = 3) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.cldInstance) {
        throw new Error('CLD3 not initialized');
      }

      const results = this.cldInstance.findMostFrequentLanguages(text, maxResults);
      const mapping = this.getCLD3ToLanguageToolMapping();

      return results.map(result => ({
        detected_language: result.language,
        confidence: Number(result.probability ?? result.confidence ?? 0),
        languagetool_code: mapping[result.language] || this.config.fallbackLanguage,
        reliable: result.is_reliable !== undefined ? result.is_reliable : true,
        source: 'cld3-multiple',
        raw_result: result
      }));

    } catch (error) {
      console.error('Multiple language detection error:', error.message);
      return [{
        detected_language: 'en',
        confidence: 0.5,
        languagetool_code: this.config.fallbackLanguage,
        reliable: false,
        source: 'error-fallback',
        error: error.message
      }];
    }
  }

  // ================== CACHE METHODS ==================
  _getCacheKey(text) {
    const textForCache = text.length > 200 ? text.substring(0, 200) : text;
    return this._hashString(textForCache);
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

  setCache(text, value) {
    if (!this.config.enableCache) return;
    const key = this._getCacheKey(text);
    this.detectionCache.set(key, { data: value, timestamp: Date.now() });
  }

  getFromCache(text) {
    if (!this.config.enableCache) return null;
    const key = this._getCacheKey(text);
    const cached = this.detectionCache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.detectionCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.detectionCache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.detectionCache.delete(key);
      }
    }
  }

  // ================== UTILITY METHODS ==================
  async healthCheck() {
    try {
      const isReady = this.isInitialized && this.cldInstance !== null;
      return {
        status: isReady ? 'healthy' : 'initializing',
        cld3_initialized: this.isInitialized,
        cache_size: this.detectionCache.size,
        config: {
          cache_enabled: this.config.enableCache,
          cache_timeout_ms: this.config.cacheTimeout,
          fallback_language: this.config.fallbackLanguage
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  getCacheStats() {
    return {
      size: this.detectionCache.size,
      enabled: this.config.enableCache,
      timeout_ms: this.config.cacheTimeout
    };
  }

  clearCache() {
    this.detectionCache.clear();
    console.log('Language detection cache cleared');
  }

  async cleanup() {
    this.detectionCache.clear();
    
    if (this.cldInstance && typeof this.cldInstance.dispose === 'function') {
      this.cldInstance.dispose();
    }
    
    this.cldInstance = null;
    this.isInitialized = false;
    this.initPromise = null;
    console.log('Language detection service cleaned up');
  }
}

// ================== SINGLETON FACTORY ==================
export async function getLanguageDetectionService(options = {}) {
  if (!languageDetectionServiceInstance) {
    languageDetectionServiceInstance = new LanguageDetectionService(options);
    await languageDetectionServiceInstance.initialize();
  }
  return languageDetectionServiceInstance;
}

// ================== CONVENIENCE FUNCTIONS ==================
export async function detectLanguage(text, options = {}) {
  const service = await getLanguageDetectionService();
  return service.detectLanguage(text, options);
}

export async function detectMultipleLanguages(text, maxResults = 3) {
  const service = await getLanguageDetectionService();
  return service.detectMultipleLanguages(text, maxResults);
}

export default LanguageDetectionService;
