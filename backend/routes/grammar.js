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
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * NEW: Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await languageToolService.healthCheck();
    res.json({ 
      success: true, 
      data: health 
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
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
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Check grammar: Cohere → Validate by LT → fallback LT if necessary
 * Updated to include language detection info in response
 */
router.post('/check', async (req, res) => {
  const { text, language = 'auto' } = req.body;

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

      console.log(`🔍 Auto-detected language: ${normalizedLang} (${detection.source}, ${detectionInfo.detection_time_ms}ms, ${(detection.confidence * 100).toFixed(1)}%)`);
    }

    // Convert to LanguageTool compatible format
    // If detected language is not supported by LT, fallback to 'en'
    if (normalizedLang === 'auto' || !normalizedLang) {
      normalizedLang = 'en';
    }

    // Step 1: Use Cohere to detect suggestions (if available)
    let cohereMatches = [];
    let validatedCohereMatches = [];
    
    if (process.env.COHERE_API_KEY) {
      const cohereStart = Date.now();
      try {
        cohereMatches = await fallbackCheckWithCohere(text);
        console.log(`✅ Cohere returned ${cohereMatches.length} matches in ${Date.now() - cohereStart}ms`);

        // Step 2: Validate Cohere's suggestions using LanguageTool
        if (cohereMatches.length > 0) {
          validatedCohereMatches = await languageToolService.validateCohereSuggestions(text, cohereMatches);
          const validationTime = Date.now() - cohereStart;
          console.log(`✅ LanguageTool validated ${validatedCohereMatches.length}/${cohereMatches.length} matches in ${validationTime}ms`);
        }
      } catch (cohereError) {
        console.warn('⚠️ Cohere check failed, using LanguageTool only:', cohereError.message);
      }
    }

    // Step 3: If Cohere didn't find anything or not available, use full LanguageTool check
    let ltResult = { matches: [] };

    if (validatedCohereMatches.length === 0) {
      const ltStart = Date.now();
      ltResult = await languageToolService.checkGrammar(text, normalizedLang);
      console.log(`✅ LanguageTool returned ${ltResult.matches.length} matches in ${Date.now() - ltStart}ms`);
    } else {
      console.log('⚠️ Skipping full LanguageTool check because Cohere found validated issues');
    }

    const finalMatches = [...validatedCohereMatches];

    // Merge additional LT suggestions (avoid duplicate offset-length)
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

    // Add language detection info if auto-detection was used
    if (detectionInfo) {
      response.data.language_detection = detectionInfo;
    }

    return res.json(response);

  } catch (error) {
    console.error('❌ Grammar check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.details || null
    });
  }
});

/**
 * NEW: Quick grammar check (LanguageTool only, no Cohere)
 * Useful for faster responses when Cohere validation is not needed
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
    
    // Check with LanguageTool (includes auto language detection via CLD3)
    const result = await languageToolService.checkGrammar(text, language);
    
    const totalTime = Date.now() - startTime;

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
    console.error('❌ Fast grammar check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;