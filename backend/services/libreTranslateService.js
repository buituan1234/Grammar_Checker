// backend/services/libreTranslateService.js
import fetch from 'node-fetch';

class LibreTranslateService {
  constructor() {
    this.baseURL = process.env.LIBRETRANSLATE_URL || 'http://localhost:8080';
    this.apiKey = process.env.LIBRETRANSLATE_API_KEY || '';
    this.timeout = 10000;
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; 
    
    setInterval(() => this.clearExpiredCache(), this.cacheTimeout);
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const res = await fetch(`${this.baseURL}/languages`, { timeout: 5000 });
      if (res.ok) {
        const langs = await res.json();
        console.log(`✅ LibreTranslate connected at ${this.baseURL} (${langs.length} languages)`);
      }
    } catch (err) {
      console.warn('⚠️ LibreTranslate not available:', err.message);
    }
  }

  normalizeLanguageCode(langCode) {
    const mapping = {
      'en-US': 'en', 'en-GB': 'en', 'en': 'en',
      'fr-FR': 'fr', 'fr': 'fr',
      'de-DE': 'de', 'de': 'de',
      'es-ES': 'es', 'es': 'es',
      'it-IT': 'it', 'it': 'it',
      'pt-PT': 'pt', 'pt-BR': 'pt', 'pt': 'pt',
      'vi-VN': 'vi', 'vi': 'vi',
      'ru-RU': 'ru', 'ru': 'ru',
      'zh-CN': 'zh', 'zh-TW': 'zt', 'zh': 'zh',
      'ja-JP': 'ja', 'ja': 'ja',
      'ko-KR': 'ko', 'ko': 'ko',
      'nl-NL': 'nl', 'nl': 'nl',
      'pl-PL': 'pl', 'pl': 'pl',
      'ar': 'ar', 'hi-IN': 'hi', 'tr-TR': 'tr', 'uk-UA': 'uk'
    };
    return mapping[langCode] || langCode.split('-')[0];
  }

  async translateToEnglish(text, sourceLang) {
    if (!text || !sourceLang) return text;
    if (sourceLang.startsWith('en')) return text;
    
    const cacheKey = `${sourceLang}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.text;
    }

    try {
      const source = this.normalizeLanguageCode(sourceLang);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeout);

      const body = {
        q: text,
        source: source,
        target: 'en',
        format: 'text'
      };

      if (this.apiKey) {
        body.api_key = this.apiKey;
      }

      const res = await fetch(`${this.baseURL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`LibreTranslate error: ${res.status}`);
      }

      const data = await res.json();
      const translated = data.translatedText || text;

      this.cache.set(cacheKey, { text: translated, timestamp: Date.now() });
      return translated;
    } catch (err) {
      console.warn(`⚠️ Translation failed (${sourceLang}): ${err.message}`);
      return text;
    }
  }

  async translateBatch(texts, sourceLang) {
    if (!Array.isArray(texts) || texts.length === 0) return [];
    return Promise.all(texts.map(text => this.translateToEnglish(text, sourceLang)));
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('LibreTranslate cache cleared');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      timeout_ms: this.cacheTimeout
    };
  }
}

const libreTranslateService = new LibreTranslateService();
export default libreTranslateService;