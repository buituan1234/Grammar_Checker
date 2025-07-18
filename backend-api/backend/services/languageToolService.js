// services/languageToolService.js - LanguageTool API service
const fetch = require('node-fetch');

class LanguageToolError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'LanguageToolError';
    this.statusCode = statusCode;
  }
}

class LanguageToolService {
  constructor() {
    this.baseURL = process.env.LANGUAGETOOL_API_URL || 'https://api.languagetool.org/v2';
    this.timeout = parseInt(process.env.API_TIMEOUT) || 10000;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check grammar using LanguageTool API
   * @param {string} text - Text to check
   * @param {string} language - Language code
   * @returns {Promise<Object>} Grammar check results
   */
  async checkGrammar(text, language = 'en-US') {
    try {
      // Check cache first
      const cacheKey = `${language}:${this.hashText(text)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Prepare request parameters
      const params = new URLSearchParams({
        text: text,
        language: language,
        enabledOnly: 'false',
        level: 'picky' // More thorough checking
      });

      // Make API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GrammarChecker/1.0'
        },
        body: params,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new LanguageToolError(
          `LanguageTool API error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      
      // Enhance results with additional processing
      const enhancedResult = this.enhanceResults(result);
      
      // Cache the result
      this.setCache(cacheKey, enhancedResult);
      
      return enhancedResult;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new LanguageToolError('Request timeout', 408);
      }
      
      if (error instanceof LanguageToolError) {
        throw error;
      }
      
      console.error('LanguageTool API error:', error);
      throw new LanguageToolError('Failed to connect to grammar checking service', 503);
    }
  }

  /**
   * Enhance LanguageTool results with additional metadata
   */
  enhanceResults(result) {
    if (!result.matches) return result;

    return {
      ...result,
      matches: result.matches.map(match => ({
        ...match,
        severity: this.getSeverity(match),
        category: this.getCategory(match),
        explanation: this.getExplanation(match)
      }))
    };
  }

  /**
   * Categorize errors by type
   */
  categorizeErrors(matches) {
    const categories = {
      spelling: 0,
      grammar: 0,
      punctuation: 0,
      style: 0,
      other: 0
    };

    matches.forEach(match => {
      const category = this.getCategory(match);
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }

  /**
   * Get error severity
   */
  getSeverity(match) {
    const ruleCategory = match.rule?.category?.id || '';
    
    if (ruleCategory.includes('GRAMMAR')) return 'high';
    if (ruleCategory.includes('TYPOS')) return 'high';
    if (ruleCategory.includes('PUNCTUATION')) return 'medium';
    if (ruleCategory.includes('STYLE')) return 'low';
    
    return 'medium';
  }

  /**
   * Get error category
   */
  getCategory(match) {
    const ruleCategory = match.rule?.category?.id || '';
    
    if (ruleCategory.includes('TYPOS')) return 'spelling';
    if (ruleCategory.includes('GRAMMAR')) return 'grammar';
    if (ruleCategory.includes('PUNCTUATION')) return 'punctuation';
    if (ruleCategory.includes('STYLE')) return 'style';
    
    return 'other';
  }

  /**
   * Get user-friendly explanation
   */
  getExplanation(match) {
    const explanations = {
      'spelling': 'Lỗi chính tả - từ có thể bị viết sai',
      'grammar': 'Lỗi ngữ pháp - cấu trúc câu không đúng',
      'punctuation': 'Lỗi dấu câu - thiếu hoặc thừa dấu câu',
      'style': 'Lỗi phong cách - có thể cải thiện để viết tốt hơn'
    };
    
    const category = this.getCategory(match);
    return explanations[category] || 'Cần kiểm tra và sửa lỗi';
  }

  /**
   * Simple text hashing for cache keys
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Cache management
   */
  setCache(key, value) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

// Clean cache every 10 minutes
setInterval(() => {
  const service = new LanguageToolService();
  service.clearExpiredCache();
}, 10 * 60 * 1000);

module.exports = LanguageToolService;