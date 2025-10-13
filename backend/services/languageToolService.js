import fetch from 'node-fetch';
import { getLanguageDetectionService } from './languageDetectionService.js';
import libreTranslateService from './libreTranslateService.js'; // ⭐ LibreTranslate Docker

class LanguageToolError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'LanguageToolError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ⭐ Dịch message sang tiếng Anh bằng LibreTranslate
async function translateMessageIfNeeded(message, langCode) {
  if (!message || !langCode) return message;
  if (langCode.startsWith('en')) return message;
  
  try {
    return await libreTranslateService.translateToEnglish(message, langCode);
  } catch (err) {
    console.warn(`⚠️ Translation failed: ${err.message}`);
    return message;
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
    const cacheKey = `${language}-${text}`;
    const cached = this.grammarCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.grammarCacheTimeout) return cached.data;

    let detectionInfo = null;
    let finalLang = language;

    if (language === 'auto') {
      detectionInfo = await this.detectLanguage(text);
      finalLang = detectionInfo.language;
      console.log(`🔍 Detected language: ${finalLang}`);
    }

    const params = new URLSearchParams({
      text,
      preferredInterfaceLanguage: 'en',
      level: 'picky'
    });

    const LT_LANG_MAP = {
      fr: 'fr',
      'fr-FR': 'fr',
      de: 'de-DE',
      'de-DE': 'de-DE',
      es: 'es',
      it: 'it',
      pt: 'pt',
      vi: 'vi-VN',
      en: 'en-US'
    };

    const ltLang = LT_LANG_MAP[finalLang] || finalLang || 'auto';
    params.append('language', ltLang);

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    let res;
    try {
      res = await fetch(`${this.baseURL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseTime = Date.now() - start;
    if (!res.ok) throw new LanguageToolError('LanguageTool API error', res.status);

    const data = await res.json();

    // 🌍 Dịch tất cả messages sang tiếng Anh
    if (Array.isArray(data.matches)) {
      const messageCount = data.matches.length;
      if (messageCount > 0) {
        console.log(`🔄 Translating ${messageCount} grammar suggestions to English...`);
        
        for (const match of data.matches) {
          // Dịch message chính
          match.message_en = await translateMessageIfNeeded(match.message, finalLang);
          
          // Dịch rule description
          if (match.rule) {
            match.rule.description_en = await translateMessageIfNeeded(match.rule.description, finalLang);
            
            // Dịch category name
            if (match.rule.category?.name) {
              match.rule.category.name_en = await translateMessageIfNeeded(match.rule.category.name, finalLang);
            }
          }
        }
        
        console.log('✅ Translation completed');
      }
    }

    const enriched = {
      ...data,
      performance: { response_time_ms: responseTime },
      language_detection: detectionInfo
    };

    this.grammarCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
    return enriched;
  }

  clearExpiredGrammarCache() {
    const now = Date.now();
    for (const [key, value] of this.grammarCache.entries()) {
      if (now - value.timestamp > this.grammarCacheTimeout) {
        this.grammarCache.delete(key);
      }
    }
  }
}

const languageToolService = new LanguageToolService();
export default languageToolService;