const API_BASE_URL = 'http://localhost:3000/api';

class FrontendCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 10 * 60 * 1000; 
    setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
  }
  generateKey(text, type, language = '') {
    const textKey = (text || '').slice(0, 100) + `_len${(text || '').length}`;
    return `${type}_${language}_${this.hashString(textKey)}`;
  }
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return String(hash);
  }
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data: value, expires: Date.now() + this.ttl });
  }
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expires) { this.cache.delete(key); return null; }
    return cached.data;
  }
  cleanExpired() {
    const now = Date.now(); let cleaned = 0;
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expires) { this.cache.delete(k); cleaned++; }
    }
    if (cleaned) console.log(`Cache cleaned: ${cleaned} items`);
  }
  clear() { this.cache.clear(); console.log('Cache cleared'); }
  getStats() { return { size: this.cache.size, maxSize: this.maxSize, ttlMinutes: this.ttl / 60000 }; }
}
const frontendCache = new FrontendCache();
if (typeof window !== 'undefined') window.grammarCache = frontendCache;

/* =========================
   Helpers
   ========================= */

export async function logUsageActivity(data) {
    try {
        const userData = (typeof AuthManager !== 'undefined') ? AuthManager.getCurrentUser() : null;
        const payload = {
          user_id: userData?.userId ?? userData?.id ?? null,
          username: userData?.username ?? userData?.name ?? null,
          action: data.action || null,
          language: data.language || null,
          metadata: data.details ?? data.metadata ?? {},
          user_agent: navigator.userAgent || '',
          session_id: sessionStorage.getItem('sessionId') || ''
        };

        await fetch('/api/usage/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userData?.userId?.toString() || '',
                'x-user-role': userData?.userRole || 'guest'
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Error logging usage:', error);
    }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (e) {
    console.warn('Response not JSON', e);
    return null;
  }
}

/* =========================
   Public API functions
   ========================= */

/** fetchLanguages - tolerant to multiple response shapes */
export const fetchLanguages = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/grammar/languages`);
    const data = await safeJson(res) || {};
    if (data?.success && data?.data?.languages) return data.data.languages;
    if (data?.languages) return data.languages;
    if (data?.data?.languagesList) return data.data.languagesList;
    throw new Error('Unexpected languages response');
  } catch (err) {
    console.error('fetchLanguages error', err);
    throw err;
  }
};

/** 
 * detectLanguage - Enhanced with CLD3 backend
 * Now returns detailed detection info including confidence and source
 */
export const detectLanguage = async (text, options = {}) => {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('Text must be a non-empty string.');
  }
  
  const trimmed = text.trim();
  const skipCache = options.skipCache || false;
  
  // Check cache first
  if (!skipCache) {
    const cacheKey = frontendCache.generateKey(trimmed, 'detect');
    const cached = frontendCache.get(cacheKey);
    if (cached) {
      console.log('🎯 Language detection from cache');
      return cached;
    }
  }  
  try {
    const startTime = performance.now();
    const res = await fetch(`${API_BASE_URL}/grammar/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    });
    
    const data = await safeJson(res) || {};
    let result;
    if (data?.success && data?.data) {
      result = {
        language: data.data.language,  
        confidence: data.data.confidence,
        reliable: data.data.reliable,
        source: data.data.source,
        detection_time_ms: data.data.detection_time_ms
      };
    } else {
      result = {
        language: 'en-US',
        confidence: 0.5,
        reliable: false,
        source: 'fallback'
      };
    }
    
    // Cache
    frontendCache.set(frontendCache.generateKey(trimmed, 'detect'), result);
    
    console.log(`🔍 Language detected: ${result.language} (${(result.confidence * 100).toFixed(1)}%, ${result.source})`);
    return result;
    
  } catch (err) {
    console.error('detectLanguage error', err);
    return {
      language: 'en-US',
      confidence: 0.5,
      reliable: false,
      source: 'error-fallback',
      error: err.message
    };
  }
};

/**
 * NEW: detectMultipleLanguages
 * Detect multiple possible languages in text
 */
export const detectMultipleLanguages = async (text, maxResults = 3) => {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('Text must be a non-empty string.');
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/grammar/detect-multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), maxResults })
    });
    
    const data = await safeJson(res) || {};
    
    if (data?.success && data?.data?.languages) {
      return data.data.languages;
    }
    
    throw new Error('Invalid response from server');
  } catch (err) {
    console.error('detectMultipleLanguages error', err);
    throw err;
  }
};

/** 
 * checkGrammar - Enhanced with auto language detection support
 * Now includes language_detection info in response when language='auto'
 */
export const checkGrammar = async (text, language = 'auto', options = {}) => {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('Text must be a non-empty string.');
  }
  
  const trimmed = text.trim();
  const useFastCheck = options.fast || false;
  
  if (!options.skipCache) {
    const cacheKey = frontendCache.generateKey(trimmed, 'grammar', language);
    const cached = frontendCache.get(cacheKey);
    if (cached) {
      console.log('🎯 Grammar check from cache');
      return cached;
    }
  }
  
  try {
    const endpoint = useFastCheck ? '/grammar/check-fast' : '/grammar/check';
    const startTime = performance.now();
    
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, language })
    });
    
    const data = await safeJson(res) || {};
    
    let result = null;
    if (data.success && data.data) {
      result = data.data;
    } else if (data.matches) {
      result = { matches: data.matches };
    } else if (data.data?.matches) {
      result = data.data;
    } else {
      result = data;
    }
    
    if (!result.performance) {
      result.performance = {
        frontend_time_ms: performance.now() - startTime
      };
    }
    
    frontendCache.set(frontendCache.generateKey(trimmed, 'grammar', language), result);
    
    if (result.language_detection) {
    }
    return result;
    
  } catch (err) {
    console.error('checkGrammar error', err);
    throw new Error('Could not connect to the server to check grammar.');
  }
};

/**
 * NEW: Health check endpoint
 */
export const healthCheck = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/grammar/health`);
    const data = await safeJson(res) || {};
    
    if (data?.success && data?.data) {
      return data.data;
    }
    
    return data;
  } catch (err) {
    console.error('healthCheck error', err);
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
};

/**
 * NEW: Get language detection stats
 */
export const getDetectionStats = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/grammar/detection-stats`);
    const data = await safeJson(res) || {};
    
    if (data?.success && data?.data) {
      return data.data;
    }
    
    return data;
  } catch (err) {
    console.error('getDetectionStats error', err);
    throw err;
  }
};

/** registerUser */
export async function registerUser(userData) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(userData)
    });
    const data = await safeJson(res);
    return { 
      success: res.ok && data?.success, 
      message: data?.message, 
      error: data?.error, 
      status: res.status, 
      data: data?.data || data 
    };
  } catch (err) {
    console.error('registerUser error', err);
    return { success: false, error: 'Network error', status: 500 };
  }
}

/** loginUser (tolerant) */
export async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ username, password })
    });
    const data = await safeJson(res) || {};
    return {
      success: res.ok && data.success,
      message: data.message || '',
      error: data.error || null,
      token: data.token || `session-${data.userId || '0'}-${Date.now()}`,
      userId: data.userId || data.id || data.user?.id,
      username: data.username || data.user?.username,
      email: data.email || data.user?.email,
      phone: data.phone || data.user?.phone,
      userRole: data.userRole || data.user?.userRole || data.role,
      status: res.status
    };
  } catch (err) {
    console.error('loginUser error', err);
    return { success: false, error: 'Network error', status: 500 };
  }
}

/** fetchUsers (admin) */
export const fetchUsers = async () => {
  try {
    const userData = (typeof AuthManager !== 'undefined') ? AuthManager.getCurrentUser() : null;
    if (!AuthManager.isAdmin) throw new Error('Authentication required');
    const res = await fetch(`${API_BASE_URL}/users/admin/users`, {
      method: 'GET', 
      headers: { 
        'Content-Type': 'application/json', 
        'x-user-role': userData.userRole 
      }
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data.users || data.data?.users || data.data || [];
  } catch (err) {
    console.error('fetchUsers error', err);
    throw err;
  }
};

/** updateUser */
export const updateUser = async (userId, userData) => {
  try {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.userRole !== 'admin') {
      return { success: false, error: 'Admin auth required' };
    }
    const res = await fetch(`${API_BASE_URL}/users/admin/update/${userId}`, {
      method: 'PUT', 
      headers: { 
        'Content-Type': 'application/json', 
        'x-user-role': currentUser.userRole 
      }, 
      body: JSON.stringify(userData)
    });
    const data = await safeJson(res) || {};
    return { 
      success: res.ok && data.success, 
      error: data.error, 
      message: data.message 
    };
  } catch (err) {
    console.error('updateUser error', err);
    return { success: false, error: 'Network error' };
  }
};

/** deleteUser */
export const deleteUser = async (userId) => {
  try {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.userRole !== 'admin') {
      return { success: false, error: 'Admin auth required' };
    }
    const res = await fetch(`${API_BASE_URL}/users/admin/delete/${userId}`, {
      method: 'DELETE', 
      headers: { 
        'Content-Type': 'application/json', 
        'x-user-role': currentUser.userRole 
      }
    });
    const data = await safeJson(res) || {};
    return { 
      success: res.ok && data.success, 
      error: data.error, 
      message: data.message 
    };
  } catch (err) {
    console.error('deleteUser error', err);
    return { success: false, error: 'Network error' };
  }
};

/* =========================
   Cache controls
   ========================= */
export const clearGrammarCache = () => { frontendCache.clear(); };
export const getCacheStats = () => frontendCache.getStats();
export const cacheManager = frontendCache;