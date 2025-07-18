// routes/grammar.js - Grammar checking routes
const express = require('express');
const { body, validationResult } = require('express-validator');
const LanguageToolService = require('../services/languageToolService');
const router = express.Router();

const languageToolService = new LanguageToolService();

// Validation rules
const checkGrammarValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Text must be between 1 and 10,000 characters'),
  body('language')
    .optional()
    .isIn(['en-US', 'en-GB', 'vi', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'])
    .withMessage('Invalid language code')
];

// POST /api/grammar/check - Check grammar
router.post('/check', checkGrammarValidation, async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { text, language = 'en-US' } = req.body;
    
    // Additional text sanitization
    const sanitizedText = text.replace(/[<>]/g, ''); // Basic XSS prevention
    
    // Call LanguageTool API
    const result = await languageToolService.checkGrammar(sanitizedText, language);
    
    // Process and enhance results
    const processedResult = {
      ...result,
      statistics: {
        totalErrors: result.matches?.length || 0,
        errorTypes: languageToolService.categorizeErrors(result.matches || []),
        processingTime: Date.now() - req.startTime
      }
    };

    res.json({
      success: true,
      data: processedResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Grammar check error:', error);
    
    if (error.name === 'LanguageToolError') {
      return res.status(503).json({
        success: false,
        error: 'Grammar checking service temporarily unavailable'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to check grammar'
    });
  }
});

// GET /api/grammar/languages - Get supported languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      languages: [
        { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
        { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: '한국어', flag: '🇰🇷' }
      ]
    }
  });
});

// Middleware to track request start time
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

module.exports = router;