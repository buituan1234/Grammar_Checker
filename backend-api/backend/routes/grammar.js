// routes/grammar.js - Grammar checking routes with proper language codes
const express = require('express');
const { body, validationResult } = require('express-validator');
const LanguageToolService = require('../services/languageToolService');
const router = express.Router();

const languageToolService = new LanguageToolService();

// Middleware to track free usage
const freeUsageTracker = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const sessionId = req.headers['x-session-id'] || ip;
  
  // Initialize usage tracking
  if (!global.freeUsage) {
    global.freeUsage = new Map();
  }
  
  const userUsage = global.freeUsage.get(sessionId) || { count: 0, firstUse: Date.now() };
  
  // Reset after 24 hours
  if (Date.now() - userUsage.firstUse > 24 * 60 * 60 * 1000) {
    userUsage.count = 0;
    userUsage.firstUse = Date.now();
  }
  
  req.freeUsageCount = userUsage.count;
  req.sessionId = sessionId;
  
  next();
};

// Validation rules - Updated with correct language codes
const checkGrammarValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Text must be between 1 and 10,000 characters'),
  body('language')
    .optional()
    .isIn(['en-US', 'en-GB', 'de-DE', 'es', 'fr', 'nl'])
    .withMessage('Invalid language code')
];

// POST /api/grammar/check - Check grammar
router.post('/check', freeUsageTracker, checkGrammarValidation, async (req, res) => {
  try {
    // Check if user is authenticated (has token)
    const authToken = req.headers.authorization;
    const isAuthenticated = authToken && authToken.startsWith('Bearer ');
    
    // Check free usage limit for non-authenticated users
    if (!isAuthenticated && req.freeUsageCount >= 3) {
      return res.status(403).json({
        success: false,
        error: 'Free usage limit reached. Please register or login to continue.',
        requiresAuth: true,
        remainingChecks: 0
      });
    }
    
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
    
    // Update free usage count for non-authenticated users
    if (!isAuthenticated) {
      const userUsage = global.freeUsage.get(req.sessionId) || { count: 0, firstUse: Date.now() };
      userUsage.count++;
      global.freeUsage.set(req.sessionId, userUsage);
    }
    
    // Process and enhance results
    const processedResult = {
      ...result,
      statistics: {
        totalErrors: result.matches?.length || 0,
        errorTypes: languageToolService.categorizeErrors(result.matches || []),
        processingTime: Date.now() - req.startTime
      },
      usage: {
        remainingChecks: isAuthenticated ? 'unlimited' : (3 - (req.freeUsageCount + 1)),
        isAuthenticated
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
        { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'nl', name: 'Netherlands', flag: 'NL' }
      ]
    }
  });
});

// GET /api/grammar/usage - Get usage stats
router.get('/usage', freeUsageTracker, (req, res) => {
  const authToken = req.headers.authorization;
  const isAuthenticated = authToken && authToken.startsWith('Bearer ');
  
  res.json({
    success: true,
    data: {
      used: isAuthenticated ? 0 : req.freeUsageCount,
      remaining: isAuthenticated ? 'unlimited' : (3 - req.freeUsageCount),
      limit: isAuthenticated ? 'unlimited' : 3,
      isAuthenticated
    }
  });
});

// Middleware to track request start time
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

module.exports = router;