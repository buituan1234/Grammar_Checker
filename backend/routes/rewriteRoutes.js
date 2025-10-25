// backend/routes/rewriteRoutes.js

import express from 'express';
import rateLimit from 'express-rate-limit';
import { rewriteText, getToneOptions } from '../services/cohereRewriteService.js';

const router = express.Router();

// Rate limiting
const rewriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    message: 'Too many rewrite requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

router.use(rewriteLimiter);

// ========== RESPONSE HELPERS ==========

const successResponse = (data, message = null) => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
});

const errorResponse = (error, statusCode = 500, details = null) => ({
    success: false,
    error,
    details: process.env.NODE_ENV !== 'production' ? details : undefined,
    statusCode,
    timestamp: new Date().toISOString()
});

// ========== VALIDATION ==========

const validateRewriteInput = (text, tone) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Text is required and must be a non-empty string');
    }

    if (text.length < 10) {
        throw new Error('Text must be at least 10 characters long');
    }

    if (text.length > 2000) {
        throw new Error('Text cannot exceed 2000 characters');
    }

    if (!tone || typeof tone !== 'string') {
        throw new Error('Tone is required and must be a string');
    }

    const validTones = getToneOptions().map(t => t.value);
    if (!validTones.includes(tone)) {
        throw new Error(`Invalid tone. Valid options: ${validTones.join(', ')}`);
    }
};

// ========== ROUTES ==========

/**
 * GET /api/rewrite/tones
 * Get available tone options
 */
router.get('/tones', (req, res) => {
    try {
        console.log('[REWRITE] Fetching tone options');
        const tones = getToneOptions();
        res.json(successResponse(tones, 'Tone options retrieved successfully'));
    } catch (err) {
        console.error('[REWRITE] Error fetching tones:', err.message);
        res.status(500).json(errorResponse('Failed to fetch tone options', 500, err.message));
    }
});

/**
 * POST /api/rewrite
 * Rewrite text with specified tone
 * Body: { text: string, tone: string }
 */
router.post('/', async (req, res) => {
    const startTime = Date.now();
    const { text, tone = 'professional' } = req.body;

    console.log('[REWRITE] Request received', {
        textLength: text?.length || 0,
        tone
    });

    try {
        validateRewriteInput(text, tone);
        const rewrittenText = await rewriteText(text, tone);
        const totalTime = Date.now() - startTime;

        console.log('[REWRITE] Completed successfully', {
            originalLength: text.length,
            rewrittenLength: rewrittenText.length,
            tone,
            timeMs: totalTime
        });

        res.json(successResponse({
            original: text,
            rewritten: rewrittenText,
            tone: tone,
            originalLength: text.length,
            rewrittenLength: rewrittenText.length,
            performance: {
                total_time_ms: totalTime
            }
        }, 'Text rewritten successfully'));

    } catch (err) {
        const totalTime = Date.now() - startTime;
        
        console.error('[REWRITE] Error:', err.message);

        // Determine status code
        let statusCode = 500;
        if (err.message.includes('Invalid tone')) statusCode = 400;
        if (err.message.includes('required')) statusCode = 400;
        if (err.message.includes('characters')) statusCode = 400;
        if (err.message.includes('API key')) statusCode = 503;

        res.status(statusCode).json(errorResponse(
            err.message || 'Failed to rewrite text',
            statusCode,
            err.stack
        ));
    }
});

/**
 * POST /api/rewrite/batch
 * Rewrite multiple texts in batch
 * Body: { texts: [string], tone: string }
 */
router.post('/batch', async (req, res) => {
    const startTime = Date.now();
    const { texts, tone = 'professional' } = req.body;

    console.log('[REWRITE BATCH] Request received', {
        count: texts?.length || 0,
        tone
    });

    try {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Texts array is required and must contain at least one item');
        }

        if (texts.length > 10) {
            throw new Error('Batch size cannot exceed 10 items');
        }

        const validTones = getToneOptions().map(t => t.value);
        if (!validTones.includes(tone)) {
            throw new Error(`Invalid tone. Valid options: ${validTones.join(', ')}`);
        }

        // Rewrite all texts
        const results = await Promise.all(
            texts.map(async (text) => {
                try {
                    validateRewriteInput(text, tone);
                    const rewritten = await rewriteText(text, tone);
                    return {
                        success: true,
                        original: text,
                        rewritten: rewritten
                    };
                } catch (err) {
                    return {
                        success: false,
                        original: text,
                        error: err.message
                    };
                }
            })
        );

        const totalTime = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;

        console.log('[REWRITE BATCH] Completed', {
            total: results.length,
            successful: successCount,
            failed: results.length - successCount,
            timeMs: totalTime
        });

        res.json(successResponse({
            results,
            summary: {
                total: results.length,
                successful: successCount,
                failed: results.length - successCount
            },
            performance: {
                total_time_ms: totalTime,
                average_time_ms: Math.round(totalTime / results.length)
            }
        }, `Batch rewrite completed: ${successCount}/${results.length} successful`));

    } catch (err) {
        const totalTime = Date.now() - startTime;
        
        console.error('[REWRITE BATCH] Error:', err.message);

        const statusCode = err.message.includes('Invalid') || err.message.includes('required') ? 400 : 500;

        res.status(statusCode).json(errorResponse(
            err.message || 'Failed to rewrite batch',
            statusCode,
            err.stack
        ));
    }
});

/**
 * GET /api/rewrite/health
 * Health check
 */
router.get('/health', (req, res) => {
    console.log('[REWRITE] Health check');
    res.json(successResponse({
        status: 'healthy',
        service: 'Rewrite Service',
        tones: getToneOptions().length
    }, 'Service is healthy'));
});

export default router;