import fetch from 'node-fetch';
import { getLanguageDetectionService } from './languageDetectionService.js';
import GrammarCheckerFactory from '../grammar_checkers/index.js';

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
    this.grammarCache = new Map();
    this.grammarCacheTimeout = 15 * 60 * 1000;
    this.languageDetectionService = null;
    this.languageDetectionReady = false;
    this.customCheckerLanguages = ['ru-RU', 'ru', 'zh-CN', 'zh', 'ja-JP', 'ja', 'es', 'es-ES', 'it', 'it-IT'];
    this.initLanguageDetection();
    setInterval(() => this.clearExpiredGrammarCache(), this.grammarCacheTimeout);
  }

  async initLanguageDetection() {
    try {
      this.languageDetectionService = await getLanguageDetectionService({
        logLevel: 'info',
        cacheTimeout: 10 * 60 * 1000,
        fallbackLanguage: 'en-US'
      });
      this.languageDetectionReady = true;
      console.log('✅ LanguageTool Service with CLD3 detection ready');
    } catch (error) {
      console.warn('⚠️ Failed to initialize CLD3 service:', error.message);
      this.languageDetectionReady = false;
    }
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/(\.\s*\.)+/g, '.')
      .replace(/\s([?.!])/g, '$1')
      .trim();
  }

  normalizeLang(lang) {
    const LT_LANG_MAP = {
      fr: 'fr',
      'fr-FR': 'fr',
      de: 'de-DE',
      'de-DE': 'de-DE',
      es: 'es',
      it: 'it',
      pt: 'pt',
      en: 'en-US',
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      ru: 'ru-RU',
      'ru-RU': 'ru-RU',
      zh: 'zh-CN',
      'zh-CN': 'zh-CN',
      ja: 'ja-JP',
      'ja-JP': 'ja-JP'
    };
    return LT_LANG_MAP[lang] || lang || 'auto';
  }

  async detectLanguage(text) {
    if (this.languageDetectionService && this.languageDetectionReady) {
      try {
        const result = await this.languageDetectionService.detectLanguage(text);
        return {
          language: result.languagetool_code,
          confidence: result.confidence,
          reliable: result.reliable,
          source: result.source,
          detection_time_ms: result.detection_time_ms
        };
      } catch {
        return this.detectLanguageWithLanguageTool(text);
      }
    }
    return this.detectLanguageWithLanguageTool(text);
  }

  async detectLanguageWithLanguageTool(text) {
    const params = new URLSearchParams({ text, language: 'auto' });
    const start = Date.now();

    const res = await fetch(`${this.baseURL}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const json = await res.json();
    return {
      language: json.language?.detectedLanguage?.code || 'en-US',
      confidence: json.language?.detectedLanguage?.confidence || 0.5,
      reliable: true,
      source: 'languagetool-fallback',
      detection_time_ms: Date.now() - start
    };
  }

  async checkGrammar(text, language = 'auto', options = {}) {
    const cleanedText = this.cleanText(text);
    const start = Date.now();

    const cacheKey = `${language}-${cleanedText}`;
    const cached = this.grammarCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.grammarCacheTimeout) {
      console.log('[CACHE HIT]', cacheKey.substring(0, 40) + '...');
      return cached.data;
    }

    let detectionInfo = null;
    let finalLang = language;

    if (language === 'auto') {
      try {
        detectionInfo = await this.detectLanguage(cleanedText);
        finalLang = detectionInfo.language;
        console.log(`🔍 Detected language: ${finalLang} (${(detectionInfo.confidence * 100).toFixed(1)}%)`);
      } catch (error) {
        console.warn('⚠️ Language detection failed, fallback to en-US');
        finalLang = 'en-US';
      }
    }

    if (!finalLang) finalLang = 'en-US';

    const ltLang = this.normalizeLang(finalLang);
    console.log('[GRAMMAR CHECK] Using language:', ltLang);

    if (this.customCheckerLanguages.includes(ltLang)) {
      console.log('[GRAMMAR CHECK] Using custom checker for:', ltLang);
      
      try {
        const customResult = GrammarCheckerFactory.check(cleanedText, ltLang);
        
        if (customResult.success) {
          const result = {
            success: true,
            text: cleanedText,
            language: { code: ltLang },
            matches: customResult.matches,
            performance: {
              total_time_ms: Date.now() - start,
              match_count: customResult.matches.length
            },
            language_detection: detectionInfo,
            source: customResult.source
          };

          this.grammarCache.set(cacheKey, { 
            data: result, 
            timestamp: Date.now() 
          });

          console.log(`✅ Custom grammar check completed: ${result.matches.length} matches in ${result.performance.total_time_ms}ms`);
          return result;
        } else {
          console.warn('[GRAMMAR CHECK] Custom checker failed:', customResult.error);
        }
      } catch (error) {
        console.error('[GRAMMAR CHECK] Custom checker error:', error.message);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const params = new URLSearchParams({
        text: cleanedText,
        language: ltLang,
        enabledOnly: 'false',
        preferredInterfaceLanguage: 'en'
      });

      console.log('[GRAMMAR CHECK] Request params:', {
        text: cleanedText.substring(0, 50),
        language: ltLang,
        enabledOnly: 'false'
      });

      const res = await fetch(`${this.baseURL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[GRAMMAR CHECK] API Response:', res.status, errorText);
        throw new LanguageToolError(
          `LanguageTool API error: ${res.status}`,
          res.status
        );
      }

      const data = await res.json();
      const responseTime = Date.now() - start;

      const result = {
        success: true,
        text: cleanedText,
        language: { code: ltLang },
        matches: data?.matches || [],
        performance: {
          total_time_ms: responseTime,
          match_count: (data?.matches || []).length
        },
        language_detection: detectionInfo,
        source: 'languagetool-api'
      };

      this.grammarCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now() 
      });

      console.log(`✅ Grammar check completed: ${result.matches.length} matches in ${responseTime}ms`);

      return result;

    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new LanguageToolError(
          `Grammar check timeout (${this.timeout}ms)`,
          408
        );
      }

      console.error('[GRAMMAR CHECK] Error:', error.message);
      throw new LanguageToolError(
        error.message || 'Grammar check failed',
        500,
        error
      );
    }
  }

  clearExpiredGrammarCache() {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, value] of this.grammarCache.entries()) {
      if (now - value.timestamp > this.grammarCacheTimeout) {
        this.grammarCache.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
    }
  }

  // 📊 Get cache stats
  getCacheStats() {
    return {
      cache_size: this.grammarCache.size,
      cache_timeout_ms: this.grammarCacheTimeout,
      custom_checker_languages: this.customCheckerLanguages
    };
  }
}

const languageToolService = new LanguageToolService();
export default languageToolService;