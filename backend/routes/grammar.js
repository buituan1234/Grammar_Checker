import express from 'express';
import languageToolService from '../services/languageToolService.js';
import { fallbackCheckWithCohere, validateCorrectionsWithCohere } from '../services/cohereService.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

/**
 * Detect language from input text (Updated - now uses CLD3)
 */
router.post('/detect', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Text is required and must be a string' 
    });
  }

  try {
    // Now uses CLD3 for faster, more accurate detection
    const detection = await languageToolService.detectLanguage(text);
    
    res.json({ 
      success: true, 
      data: {
        language: detection.language,
        confidence: detection.confidence,
        reliable: detection.reliable,
        source: detection.source,
        detection_time_ms: detection.detection_time_ms
      }
    });
  } catch (error) {
    console.error('❌ Language detection failed:', error);
    console.error('Error stack:', error.stack); // THÊM stack trace
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * NEW: Detect multiple possible languages
 */
router.post('/detect-multiple', async (req, res) => {
  const { text, maxResults = 3 } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Text is required' 
    });
  }

  try {
    const service = languageToolService.languageDetectionService;
    
    if (!service) {
      return res.status(503).json({
        success: false,
        error: 'Language detection service not available'
      });
    }

    const results = await service.detectMultipleLanguages(text, maxResults);
    
    res.json({ 
      success: true, 
      data: { languages: results }
    });
  } catch (error) {
    console.error('❌ Multiple language detection failed:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get supported languages
 */
router.get('/languages', async (req, res) => {
  try {
    const languages = await languageToolService.getLanguages();
    res.json({ 
      success: true, 
      data: { languages } 
    });
  } catch (error) {
    console.error('❌ Failed to fetch languages:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * NEW: Enhanced Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    console.log('[HEALTH CHECK] Starting health check...');
    
    // Check LanguageTool service
    const health = await languageToolService.healthCheck();
    console.log('[HEALTH CHECK] Result:', JSON.stringify(health, null, 2));
    
    res.json({ 
      success: true, 
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * NEW: LanguageTool direct health check
 */
router.get('/languagetool-health', async (req, res) => {
  const LANGUAGETOOL_URL = process.env.LANGUAGETOOL_API_URL || 'http://localhost:8081/v2';
  const start = Date.now();
  
  try {
    console.log(`[LT HEALTH] Checking LanguageTool at ${LANGUAGETOOL_URL}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${LANGUAGETOOL_URL}/languages`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    
    console.log(`[LT HEALTH] Response: ${response.status} in ${elapsed}ms`);
    
    res.json({
      success: true,
      status: response.ok ? 'healthy' : 'degraded',
      response_time_ms: elapsed,
      url: LANGUAGETOOL_URL,
      http_status: response.status
    });
  } catch (error) {
    const elapsed = Date.now() - start;
    console.error(`[LT HEALTH] Failed in ${elapsed}ms:`, error.message);
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      response_time_ms: elapsed,
      url: LANGUAGETOOL_URL,
      hint: error.name === 'AbortError' ? 'Timeout after 5s' : 'Connection failed'
    });
  }
});

/**
 * NEW: Get language detection stats
 */
router.get('/detection-stats', async (req, res) => {
  try {
    const stats = languageToolService.getLanguageDetectionStats();
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error('❌ Failed to get detection stats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Check grammar: Enhanced with better error handling and logging
 */
router.post('/check', async (req, res) => {
  const { text, language = 'auto' } = req.body;

  console.log('[GRAMMAR CHECK] Request received:', {
    textLength: text?.length,
    textPreview: text?.substring(0, 50),
    language
  });

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing or invalid text.' 
    });
  }

  try {
    const startTime = Date.now();
    let detectionInfo = null;
    let normalizedLang = language;

    // Auto-detect language if requested (now with CLD3)
    if (language === 'auto') {
      try {
        const detectionStart = Date.now();
        const detection = await languageToolService.detectLanguage(text);
        normalizedLang = detection.language;
        
        detectionInfo = {
          detected_language: detection.language,
          confidence: detection.confidence,
          reliable: detection.reliable,
          source: detection.source,
          detection_time_ms: Date.now() - detectionStart
        };

        console.log(`[GRAMMAR CHECK] Auto-detected: ${normalizedLang} (${detection.source}, ${detectionInfo.detection_time_ms}ms, ${(detection.confidence * 100).toFixed(1)}%)`);
      } catch (detectionError) {
        console.error('[GRAMMAR CHECK] Detection failed:', detectionError);
        // Fallback to English if detection fails
        normalizedLang = 'en-US';
        detectionInfo = {
          detected_language: 'en-US',
          confidence: 0.5,
          reliable: false,
          source: 'error-fallback',
          error: detectionError.message
        };
      }
    }

    // Convert to LanguageTool compatible format
    if (normalizedLang === 'auto' || !normalizedLang) {
      normalizedLang = 'en-US';
    }

    console.log('[GRAMMAR CHECK] Using language:', normalizedLang);

    // Step 1: Use Cohere to detect suggestions (if available)
    let cohereMatches = [];
    let validatedCohereMatches = [];
    
    if (process.env.COHERE_API_KEY) {
      const cohereStart = Date.now();
      try {
        cohereMatches = await fallbackCheckWithCohere(text);
        console.log(`[GRAMMAR CHECK] Cohere: ${cohereMatches.length} matches in ${Date.now() - cohereStart}ms`);

        // Step 2: Validate Cohere's suggestions
        if (cohereMatches.length > 0) {
          validatedCohereMatches = await languageToolService.validateCohereSuggestions(text, cohereMatches);
          const validationTime = Date.now() - cohereStart;
          console.log(`[GRAMMAR CHECK] Validated: ${validatedCohereMatches.length}/${cohereMatches.length} in ${validationTime}ms`);
        }
      } catch (cohereError) {
        console.warn('[GRAMMAR CHECK] Cohere failed:', cohereError.message);
      }
    } else {
      console.log('[GRAMMAR CHECK] Cohere API key not configured, skipping');
    }

    // Step 3: Use LanguageTool
    let ltResult = { matches: [] };

    if (validatedCohereMatches.length === 0) {
      console.log('[GRAMMAR CHECK] Calling LanguageTool...');
      const ltStart = Date.now();
      
      try {
        ltResult = await languageToolService.checkGrammar(text, normalizedLang);
        console.log(`[GRAMMAR CHECK] LanguageTool: ${ltResult.matches.length} matches in ${Date.now() - ltStart}ms`);
      } catch (ltError) {
        console.error('[GRAMMAR CHECK] LanguageTool failed:', ltError);
        throw ltError; // Re-throw to be caught by outer catch
      }
    } else {
      console.log('[GRAMMAR CHECK] Skipping LanguageTool (using Cohere results)');
    }

    const finalMatches = [...validatedCohereMatches];

    // Merge additional LT suggestions
    if (ltResult?.matches?.length) {
      const existingOffsets = new Set(finalMatches.map(m => `${m.offset}-${m.length}`));
      for (const m of ltResult.matches) {
        const key = `${m.offset}-${m.length}`;
        if (!existingOffsets.has(key)) {
          finalMatches.push({
            ...m,
            source: 'languagetool',
            replacements: m.replacements?.map(r => ({ value: r.value }))
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[GRAMMAR CHECK] Complete: ${finalMatches.length} final matches in ${totalTime}ms`);

    // Build enhanced response
    const response = {
      success: true,
      data: {
        matches: finalMatches,
        language: ltResult.language || { code: normalizedLang },
        performance: {
          total_time_ms: totalTime,
          cohere_matches: cohereMatches.length,
          validated_matches: validatedCohereMatches.length,
          languagetool_matches: ltResult.matches?.length || 0,
          final_matches: finalMatches.length
        }
      }
    };

    // Add language detection info
    if (detectionInfo) {
      response.data.language_detection = detectionInfo;
    }

    return res.json(response);

  } catch (error) {
    console.error('[GRAMMAR CHECK] ❌ FAILED:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    // Check if it's a LanguageTool specific error
    if (error.statusCode) {
      console.error('LanguageTool status code:', error.statusCode);
      console.error('LanguageTool details:', error.details);
    }

    res.status(error.statusCode || 500).json({ 
      success: false, 
      error: error.message || 'Grammar check failed',
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * NEW: Quick grammar check (LanguageTool only)
 */
router.post('/check-fast', async (req, res) => {
  const { text, language = 'auto' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing or invalid text.' 
    });
  }

  try {
    const startTime = Date.now();
    
    console.log('[FAST CHECK] Request:', { textLength: text.length, language });
    
    const result = await languageToolService.checkGrammar(text, language);
    
    const totalTime = Date.now() - startTime;
    console.log(`[FAST CHECK] Complete in ${totalTime}ms`);

    return res.json({
      success: true,
      data: {
        matches: result.matches || [],
        language: result.language,
        language_detection: result.language_detection,
        performance: {
          total_time_ms: totalTime,
          response_time_ms: result.performance?.response_time_ms
        }
      }
    });

  } catch (error) {
    console.error('[FAST CHECK] ❌ Failed:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;