const API_BASE_URL = 'http://localhost:3000/api';

class FrontendCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 10 * 60 * 1000; // 10 minutes
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
function getUserData() {
  try {
    // Check user key first
    let loggedData = localStorage.getItem("loggedInAs_user");
    
    // Fallback to admin key
    if (!loggedData) {
      loggedData = localStorage.getItem("loggedInAs_admin");
    }
    
    // Fallback to legacy key
    if (!loggedData) {
      loggedData = localStorage.getItem("loggedInAs");
    }
    
    if (!loggedData) return null;
    return JSON.parse(loggedData);
  } catch (e) {
    console.error('getUserData parse error', e);
    return null;
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
    // Accept several shapes
    if (data?.success && data?.data?.languages) return data.data.languages;
    if (data?.languages) return data.languages;
    if (data?.data?.languagesList) return data.data.languagesList;
    throw new Error('Unexpected languages response');
  } catch (err) {
    console.error('fetchLanguages error', err);
    throw err;
  }
};

/** detectLanguage with caching + simple heuristics + fallback */
export const detectLanguage = async (text) => {
  if (typeof text !== 'string' || text.trim() === '') throw new Error('Text must be a non-empty string.');
  const trimmed = text.trim();
  const cacheKey = frontendCache.generateKey(trimmed, 'detect');
  const cached = frontendCache.get(cacheKey);
  if (cached) return cached;
  if (trimmed.length < 15) { frontendCache.set(cacheKey, 'en-US'); return 'en-US'; }
  if (trimmed.length < 50 && /^[a-zA-Z\s.,!?'"()-]+$/.test(trimmed)) {
    frontendCache.set(cacheKey, 'en-US'); return 'en-US';
  }
  try {
    const res = await fetch(`${API_BASE_URL}/grammar/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    });
    const data = await safeJson(res) || {};
    const detected = data?.language || data?.data?.language || data?.detected || 'en-US';
    frontendCache.set(cacheKey, detected);
    return detected;
  } catch (err) {
    console.error('detectLanguage error', err);
    frontendCache.set(cacheKey, 'en-US');
    return 'en-US';
  }
};

/** checkGrammar with caching + tolerant response parsing */
export const checkGrammar = async (text, language = 'en-US') => {
  if (typeof text !== 'string' || text.trim() === '') throw new Error('Text must be a non-empty string.');
  const trimmed = text.trim();
  const cacheKey = frontendCache.generateKey(trimmed, 'grammar', language);
  const cached = frontendCache.get(cacheKey);
  if (cached) return cached;
  try {
    const res = await fetch(`${API_BASE_URL}/grammar/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, language })
    });
    const data = await safeJson(res) || {};
    // Accept shapes: { success: true, data: {...} } or { success: true, matches: [...] } or { matches: [...] }
    let result = null;
    if (data.success && data.data) result = data.data;
    else if (data.matches) result = { matches: data.matches };
    else if (data.data?.matches) result = data.data;
    else result = data; // fallback to raw
    frontendCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('checkGrammar error', err);
    throw new Error('Could not connect to the server to check grammar.');
  }
};

/** registerUser */
export async function registerUser(userData) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData)
    });
    const data = await safeJson(res);
    return { success: res.ok && data?.success, message: data?.message, error: data?.error, status: res.status, data: data?.data || data };
  } catch (err) {
    console.error('registerUser error', err);
    return { success: false, error: 'Network error', status: 500 };
  }
}

/** loginUser (tolerant) */
export async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
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
    const userData = getUserData();
    if (!userData) throw new Error('Authentication required');
    const res = await fetch(`${API_BASE_URL}/users/admin/users`, {
      method: 'GET', headers: { 'Content-Type': 'application/json', 'x-user-role': userData.userRole }
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
    const currentUser = getUserData();
    if (!currentUser || currentUser.userRole !== 'admin') return { success: false, error: 'Admin auth required' };
    const res = await fetch(`${API_BASE_URL}/users/admin/update/${userId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-role': currentUser.userRole }, body: JSON.stringify(userData)
    });
    const data = await safeJson(res) || {};
    return { success: res.ok && data.success, error: data.error, message: data.message };
  } catch (err) {
    console.error('updateUser error', err);
    return { success: false, error: 'Network error' };
  }
};

/** deleteUser */
export const deleteUser = async (userId) => {
  try {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userRole !== 'admin') return { success: false, error: 'Admin auth required' };
    const res = await fetch(`${API_BASE_URL}/users/admin/delete/${userId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-user-role': currentUser.userRole }
    });
    const data = await safeJson(res) || {};
    return { success: res.ok && data.success, error: data.error, message: data.message };
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
