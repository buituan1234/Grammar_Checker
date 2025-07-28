// backend/routes/grammar.js - Updated with enhanced usage tracking and single best suggestions

const express = require('express');
const { body, validationResult } = require('express-validator');
const LanguageToolService = require('../services/languageToolService');
const router = express.Router();

const languageToolService = new LanguageToolService();

// Enhanced middleware to track free usage with session management
const freeUsageTracker = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const sessionId = req.headers['x-session-id'] || `ip_${ip}`;
  
  // Initialize global usage tracking
  if (!global.freeUsage) {
    global.freeUsage = new Map();
  }
  
  const userUsage = global.freeUsage.get(sessionId) || { 
    count: 0, 
    firstUse: Date.now(),
    lastUse: Date.now()
  };
  
  // Reset usage after 24 hours
  const RESET_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - userUsage.firstUse > RESET_PERIOD) {
    userUsage.count = 0;
    userUsage.firstUse = Date.now();
  }
  
  // Update last use time
  userUsage.lastUse = Date.now();
  
  req.freeUsageCount = userUsage.count;
  req.sessionId = sessionId;
  req.userUsage = userUsage;
  
  next();
};

// Authentication checker middleware
const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  req.isAuthenticated = authHeader && authHeader.startsWith('Bearer ');
  
  if (req.isAuthenticated) {
    req.authToken = authHeader.split(' ')[1];
    // Here you could verify the token against your sessions map
    // For now, we'll assume valid if present
  }
  
  next();
};

// Enhanced validation rules
const checkGrammarValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Text must be between 1 and 10,000 characters')
    .custom(value => {
      // Additional validation for meaningful content
      if (value.replace(/\s+/g, '').length < 3) {
        throw new Error('Text must contain meaningful content');
      }
      return true;
    }),
  body('language')
    .optional()
    .isIn(['en-US', 'en-GB', 'de-DE', 'es', 'fr', 'nl'])
    .withMessage('Invalid language code')
];

// POST /api/grammar/check - Enhanced grammar checking with usage limits
router.post('/check', 
  freeUsageTracker, 
  checkAuth, 
  checkGrammarValidation, 
  async (req, res) => {
    const startTime = Date.now();
    
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
      const MAX_FREE_CHECKS = 3;
      
      // Check usage limits for non-authenticated users
      if (!req.isAuthenticated && req.freeUsageCount >= MAX_FREE_CHECKS) {
        return res.status(403).json({
          success: false,
          error: 'Free usage limit reached. Please register or login to continue.',
          requiresAuth: true,
          remainingChecks: 0,
          usageInfo: {
            used: req.freeUsageCount,
            limit: MAX_FREE_CHECKS,
            resetTime: req.userUsage.firstUse + (24 * 60 * 60 * 1000)
          }
        });
      }
      
      // Clean and validate text
      const cleanedText = languageToolService.cleanText(text);
      if (!cleanedText) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or empty text provided'
        });
      }

      // Validate language support
      if (!languageToolService.isLanguageSupported(language)) {
        return res.status(400).json({
          success: false,
          error: `Language '${language}' is not supported`
        });
      }
      
      // Call LanguageTool API with enhanced error handling
      let result;
      try {
        result = await languageToolService.checkGrammar(cleanedText, language);
      } catch (apiError) {
        console.error('LanguageTool API Error:', apiError);
        
        if (apiError.name === 'LanguageToolError') {
          return res.status(503).json({
            success: false,
            error: 'Grammar checking service temporarily unavailable',
            retryAfter: 30
          });
        }
        
        throw apiError; // Re-throw unexpected errors
      }
      
      // Update usage count for non-authenticated users
      if (!req.isAuthenticated) {
        req.userUsage.count++;
        global.freeUsage.set(req.sessionId, req.userUsage);
      }
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Enhanced result processing
      const enhancedResult = {
        ...result,
        statistics: {
          totalErrors: result.matches?.length || 0,
          errorTypes: languageToolService.categorizeErrors(result.matches || []),
          processingTime: processingTime,
          textLength: cleanedText.length,
          wordCount: cleanedText.split(/\s+/).length
        },
        usage: {
          remainingChecks: req.isAuthenticated ? 'unlimited' : (MAX_FREE_CHECKS - req.userUsage.count),
          isAuthenticated: req.isAuthenticated,
          totalUsed: req.isAuthenticated ? 'unlimited' : req.userUsage.count,
          resetTime: req.isAuthenticated ? null : req.userUsage.firstUse + (24 * 60 * 60 * 1000)
        },
        meta: {
          language: language,
          version: '2.0',
          processingMode: 'single-best-suggestion'
        }
      };

      // Log usage for monitoring
      console.log(`Grammar check completed: ${req.sessionId} | ${req.isAuthenticated ? 'AUTH' : 'FREE'} | ${result.matches?.length || 0} errors | ${processingTime}ms`);

      res.json({
        success: true,
        data: enhancedResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Grammar check error:', error);
      
      // Categorize error types for better user experience
      let statusCode = 500;
      let errorMessage = 'Failed to check grammar';
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        statusCode = 503;
        errorMessage = 'Grammar service temporarily unavailable';
      } else if (error.code === 'ECONNABORTED' || error.code === 'TIMEOUT') {
        statusCode = 408;
        errorMessage = 'Request timeout - please try again';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/grammar/languages - Get supported languages with enhanced info
router.get('/languages', (req, res) => {
  const languages = languageToolService.getSupportedLanguages();
  
  res.json({
    success: true,
    data: {
      languages: languages,
      total: languages.length,
      updated: new Date().toISOString()
    }
  });
});

// GET /api/grammar/usage - Enhanced usage statistics
router.get('/usage', freeUsageTracker, checkAuth, (req, res) => {
  const MAX_FREE_CHECKS = 3;
  
  const usageData = {
    isAuthenticated: req.isAuthenticated,
    plan: req.isAuthenticated ? 'premium' : 'free'
  };
  
  if (req.isAuthenticated) {
    usageData.used = 'unlimited';
    usageData.remaining = 'unlimited';
    usageData.limit = 'unlimited';
  } else {
    usageData.used = req.freeUsageCount;
    usageData.remaining = Math.max(0, MAX_FREE_CHECKS - req.freeUsageCount);
    usageData.limit = MAX_FREE_CHECKS;
    usageData.resetTime = req.userUsage.firstUse + (24 * 60 * 60 * 1000);
    usageData.timeUntilReset = Math.max(0, usageData.resetTime - Date.now());
  }
  
  res.json({
    success: true,
    data: usageData,
    timestamp: new Date().toISOString()
  });
});

// GET /api/grammar/stats - API statistics (for monitoring)
router.get('/stats', (req, res) => {
  const totalSessions = global.freeUsage ? global.freeUsage.size : 0;
  let totalFreeChecks = 0;
  let activeSessions = 0;
  
  if (global.freeUsage) {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    
    global.freeUsage.forEach(usage => {
      totalFreeChecks += usage.count;
      if (now - usage.lastUse < DAY_MS) {
        activeSessions++;
      }
    });
  }
  
  res.json({
    success: true,
    data: {
      totalSessions,
      activeSessions,
      totalFreeChecks,
      supportedLanguages: languageToolService.getSupportedLanguages().length,
      uptime: process.uptime()
    },
    timestamp: new Date().toISOString()
  });
});

// Middleware to track request start time for all routes
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Cleanup old sessions periodically (runs every hour)
setInterval(() => {
  if (global.freeUsage) {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 48 * 60 * 60 * 1000; // 48 hours
    
    let cleanedCount = 0;
    for (const [sessionId, usage] of global.freeUsage.entries()) {
      if (now - usage.lastUse > CLEANUP_THRESHOLD) {
        global.freeUsage.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old sessions`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = router;