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
      minBytes: options.minBytes || 0,
      maxBytes: options.maxBytes || 2000,
      enableCache: options.enableCache !== false,
      cacheTimeout: options.cacheTimeout || 10 * 60 * 1000,
      fallbackLanguage: options.fallbackLanguage || 'en-US',
      logLevel: options.logLevel || 'info'
    };

    // Cache
    this.detectionCache = new Map();
    
    // Auto cleanup cache
    if (this.config.enableCache) {
      setInterval(() => this.clearExpiredCache(), this.config.cacheTimeout);
    }

    // Initialize CLD3 (non-blocking)
    this.initialize();
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
        console.error('Available cldFactory methods:', Object.keys(cldFactory));
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
      'pt': 'pt', 'nl': 'nl', 'ru': 'ru-RU', 'pl': 'pl-PL', 'sv': 'sv',
      'da': 'da-DK', 'no': 'en', 'fi': 'en', 'is': 'en',
      
      'cs': 'en', 'sk': 'sk-SK', 'hu': 'en', 'ro': 'ro-RO', 'bg': 'en',
      'hr': 'en', 'sr': 'en', 'sl': 'sl-SI', 'lv': 'en', 'lt': 'en',
      'et': 'en', 'mk': 'en', 'mt': 'en',
      
      'ca': 'ca-ES', 'eu': 'en', 'gl': 'gl-ES', 'cy': 'en', 'ga': 'ga-IE',
      'gd': 'en', 'br': 'br-FR', 'co': 'en', 'ast': 'en',
      
      'ar': 'ar', 'he': 'en', 'fa': 'fa', 'ur': 'en', 'ps': 'en',
      'am': 'en', 'ti': 'en', 'so': 'en', 'sw': 'en', 'ha': 'en',
      
      'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-CN',
      'ja': 'ja-JP', 'ko': 'en', 'vi': 'en', 'th': 'en', 'lo': 'en',
      'km': 'en', 'my': 'en', 'si': 'en', 'ta': 'ta-IN', 'te': 'en',
      'ml': 'en', 'kn': 'en', 'hi': 'en', 'bn': 'en', 'gu': 'en',
      'pa': 'en', 'mr': 'en', 'ne': 'en', 'or': 'en', 'as': 'en',
      
      'tr': 'en', 'az': 'en', 'kk': 'en', 'ky': 'en', 'uz': 'en',
      'tg': 'en', 'mn': 'en', 'ka': 'en', 'hy': 'en', 'be': 'en',
      'uk': 'uk-UA', 'tl': 'tl-PH', 'ceb': 'en', 'haw': 'en',
      'mg': 'en', 'sm': 'en', 'to': 'en', 'fj': 'en'
    };
  }

  // ================== PATTERN-BASED PRE-CHECK ==================
  preCheckPatterns(text) {
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

    // Japanese Hiragana/Katakana
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

    // Chinese (Han characters without Japanese kana)
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

    // Korean Hangul
    if (/[\uAC00-\uD7AF\u1100-\u11FF]{2,}/.test(text)) {
      return {
        detected_language: 'ko',
        confidence: 0.98,
        languagetool_code: 'en',
        reliable: true,
        source: 'pattern-korean',
        detection_time_ms: 0
      };
    }

    // Arabic script
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

    // Thai script
    if (/[\u0E00-\u0E7F]{2,}/.test(text)) {
      return {
        detected_language: 'th',
        confidence: 0.98,
        languagetool_code: 'en',
        reliable: true,
        source: 'pattern-thai',
        detection_time_ms: 0
      };
    }

    // Spanish markers
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

    // Portuguese specific words
    if (/\b(você|está|não|também|português)\b/i.test(text)) {
      return {
        detected_language: 'pt',
        confidence: 0.85,
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

    return null;
  }

  // ================== MAIN DETECTION METHOD ==================
  async detectLanguage(text, options = {}) {
  try {
    // === DEBUG: Input validation ===
    console.log('=== LANGUAGE DETECTION DEBUG ===');
    console.log('Input text:', text);
    console.log('Text length:', text.length);
    console.log('Text type:', typeof text);
    console.log('First 5 chars:', text.slice(0, 5));
    console.log('Char codes:', [...text.slice(0, 5)].map(c => `${c}:${c.charCodeAt(0).toString(16)}`));
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    // === DEBUG: Cache check ===
    if (this.config.enableCache && !options.skipCache) {
      const cached = this.getFromCache(text);
      if (cached) {
        console.log('✅ CACHE HIT - returning cached result:', cached);
        if (this.config.logLevel === 'debug') {
          console.log('[CACHE HIT] Language detection');
        }
        return cached;
      }
      console.log('❌ CACHE MISS - proceeding with detection');
    }

    // === DEBUG: Pattern pre-check ===
    console.log('Testing pattern matching...');
    console.log('Cyrillic test:', /[\u0400-\u04FF]{3,}/.test(text));
    console.log('Japanese test:', /[\u3040-\u309F\u30A0-\u30FF]{2,}/.test(text));
    console.log('Chinese test:', /[\u4E00-\u9FFF]{2,}/.test(text));
    console.log('Arabic test:', /[\u0600-\u06FF\u0750-\u077F]{2,}/.test(text));
    console.log('Vietnamese test:', /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text));
    
    const preCheck = this.preCheckPatterns(text);
    console.log('Pattern pre-check result:', preCheck);
    
    if (preCheck) {
      console.log('✅ Pattern matched! Returning:', preCheck);
      if (this.config.logLevel === 'info') {
        console.log(`Pattern detected: ${preCheck.detected_language} -> ${preCheck.languagetool_code} (${(preCheck.confidence * 100).toFixed(1)}%, ${preCheck.source})`);
      }
      this.setCache(text, preCheck);
      return preCheck;
    }
    console.log('❌ No pattern matched, proceeding to CLD3...');

    // === DEBUG: CLD3 initialization ===
    if (!this.isInitialized) {
      console.log('⚠️ CLD3 not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.cldInstance) {
      throw new Error('CLD3 not initialized');
    }
    console.log('✅ CLD3 instance ready');
    console.log('CLD3 config - minBytes:', this.config.minBytes, 'maxBytes:', this.config.maxBytes);

    // === DEBUG: CLD3 detection ===
    console.log('Calling CLD3.findLanguage()...');
    const startTime = Date.now();
    const result = this.cldInstance.findLanguage(text);
    const detectionTime = Date.now() - startTime;
    
    console.log('=== CLD3 RAW RESULT ===');
    console.log('Full result object:', JSON.stringify(result, null, 2));
    console.log('result.language:', result?.language);
    console.log('result.probability:', result?.probability);
    console.log('result.is_reliable:', result?.is_reliable);
    console.log('Detection time:', detectionTime, 'ms');

    // === DEBUG: Result validation ===
    if (!result || !result.language) {
      console.log('⚠️ CLD3 returned invalid result - no language detected');
      const fallbackResult = {
        detected_language: 'en',
        confidence: 0.5,
        languagetool_code: this.config.fallbackLanguage,
        reliable: false,
        source: 'fallback-no-detection',
        detection_time_ms: detectionTime
      };
      
      this.setCache(text, fallbackResult);
      console.log('Returning fallback result:', fallbackResult);
      return fallbackResult;
    }

    // === DEBUG: Mapping ===
    const mapping = this.getCLD3ToLanguageToolMapping();
    const ltCode = mapping[result.language] || this.config.fallbackLanguage;
    console.log('Language mapping:', result.language, '->', ltCode);

    const detectionResult = {
      detected_language: result.language,
      confidence: result.probability || result.confidence || 0,
      languagetool_code: ltCode,
      reliable: result.is_reliable !== undefined ? result.is_reliable : true,
      source: 'cld3',
      detection_time_ms: detectionTime,
      raw_result: result
    };

    console.log('=== FINAL DETECTION RESULT ===');
    console.log(JSON.stringify(detectionResult, null, 2));

    // === DEBUG: Low confidence check ===
    if (detectionResult.confidence < 0.3) {
      console.warn('⚠️ WARNING: Very low confidence detection!');
      console.warn('Consider implementing fallback pattern matching for this text');
    }

    // Cache result
    if (this.config.enableCache) {
      this.setCache(text, detectionResult);
      console.log('✅ Result cached');
    }

    // Logging
    if (this.config.logLevel === 'info') {
      const confidence = result.probability || result.confidence || 0;
      const reliable = result.is_reliable !== undefined ? result.is_reliable : true;
      console.log(`Detected: ${result.language} -> ${ltCode} (${(confidence * 100).toFixed(1)}%, ${reliable ? 'reliable' : 'unreliable'}, ${detectionTime}ms)`);
    }

    console.log('=== END DETECTION DEBUG ===\n');
    return detectionResult;

  } catch (error) {
    console.error('❌ Language detection error:', error);
    console.error('Error stack:', error.stack);
    
    const errorResult = {
      detected_language: 'en',
      confidence: 0.5,
      languagetool_code: this.config.fallbackLanguage,
      reliable: false,
      source: 'error-fallback',
      error: error.message
    };

    console.log('Returning error fallback:', errorResult);
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
        confidence: result.probability || result.confidence || 0,
        languagetool_code: mapping[result.language] || this.config.fallbackLanguage,
        reliable: result.is_reliable !== undefined ? result.is_reliable : true,
        source: 'cld3-multiple'
      }));

    } catch (error) {
      console.error('Multiple language detection error:', error);
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