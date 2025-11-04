import express from 'express';
import languageToolService from '../services/languageToolService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Helper function to validate text input
const validateText = (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { valid: false, error: 'Text is required and must be a non-empty string.' };
  }
  return { valid: true };
};

const cleanText = (text) => {
  return text
    .normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,!?;:'"()\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Detect language from input text 
 */
router.post('/detect', async (req, res) => {
  const { text } = req.body;
  const validation = validateText(text);

  if (!validation.valid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.error 
    });
  }

  try {
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
    console.error('❌ Language detection failed:', error.message);
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
    console.error('❌ Failed to fetch languages:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    console.log('[HEALTH CHECK] Starting health check...');
    
    const health = await languageToolService.healthCheck();
    console.log('[HEALTH CHECK] Result:', JSON.stringify(health, null, 2));
    
    res.json({ 
      success: true, 
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get grammar cache statistics
 */
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = languageToolService.getCacheStats();
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Check grammar - Main endpoint
 */
router.post('/check', async (req, res) => {
  const startTime = Date.now();
  const { text, language = 'auto' } = req.body;

  const validation = validateText(text);
  if (!validation.valid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.error
    });
  }

  try {
    console.log('[GRAMMAR CHECK] Request received:', {
      textLength: text.length,
      textPreview: text.substring(0, 80),
      language
    });

    const cleanedText = cleanText(text);

    if (!cleanedText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is empty after cleaning.' 
      });
    }

    const result = await languageToolService.checkGrammar(cleanedText, language);
    const totalTime = Date.now() - startTime;

    console.log(`[GRAMMAR CHECK] Completed: ${result.matches.length} matches in ${totalTime}ms`);

    return res.json({
      success: true,
      data: {
        text: result.text,
        language: result.language,
        matches: result.matches,
        language_detection: result.language_detection,
        performance: result.performance
      }
    });

  } catch (error) {
    console.error('[GRAMMAR CHECK] ❌ Failed:', error.message);
    
    const totalTime = Date.now() - startTime;

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Grammar check failed',
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      performance: {
        total_time_ms: totalTime
      }
    });
  }
});

export default router;