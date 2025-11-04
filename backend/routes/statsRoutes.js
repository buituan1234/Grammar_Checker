import express from 'express';
import sql from 'mssql';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ========== CONSTANTS ==========

const LANGUAGE_NAMES = {
  'en-US': 'English (US)', 'en': 'English', 'en-GB': 'English (UK)',
  'fr': 'French', 'fr-FR': 'French (France)',
  'de': 'German', 'de-DE': 'German (Germany)', 'de-AT': 'German (Austria)', 'de-CH': 'German (Switzerland)',
  'ru': 'Russian', 'ru-RU': 'Russian', 'uk': 'Ukrainian', 'uk-UA': 'Ukrainian',
  'ja': 'Japanese', 'ja-JP': 'Japanese',
  'es': 'Spanish', 'es-ES': 'Spanish (Spain)',
  'pt': 'Portuguese', 'pt-PT': 'Portuguese (Portugal)', 'pt-BR': 'Portuguese (Brazil)',
  'gl-ES': 'Galician', 'it': 'Italian', 'it-IT': 'Italian',
  'nl': 'Dutch', 'nl-NL': 'Dutch', 'pl': 'Polish', 'pl-PL': 'Polish',
  'sv': 'Swedish', 'sv-SE': 'Swedish', 'da': 'Danish', 'da-DK': 'Danish',
  'ar': 'Arabic', 'zh': 'Chinese', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ko': 'Korean', 'ko-KR': 'Korean', 'vi': 'Vietnamese', 'th': 'Thai',
  'be': 'Belarusian', 'be-BY': 'Belarusian', 'bg': 'Bulgarian', 'bg-BG': 'Bulgarian',
  'sr': 'Serbian', 'sr-RS': 'Serbian', 'ca': 'Catalan', 'ca-ES': 'Catalan',
  'cs': 'Czech', 'cs-CZ': 'Czech', 'el': 'Greek', 'el-GR': 'Greek',
  'fa': 'Persian', 'fa-IR': 'Persian', 'fi': 'Finnish', 'fi-FI': 'Finnish',
  'he': 'Hebrew', 'he-IL': 'Hebrew', 'hi': 'Hindi', 'hi-IN': 'Hindi',
  'hu': 'Hungarian', 'hu-HU': 'Hungarian', 'id': 'Indonesian', 'id-ID': 'Indonesian',
  'lt': 'Lithuanian', 'lt-LT': 'Lithuanian', 'lv': 'Latvian', 'lv-LV': 'Latvian',
  'nb': 'Norwegian (Bokmål)', 'nb-NO': 'Norwegian (Bokmål)', 'ro': 'Romanian', 'ro-RO': 'Romanian',
  'sk': 'Slovak', 'sk-SK': 'Slovak', 'sl': 'Slovenian', 'sl-SI': 'Slovenian',
  'tr': 'Turkish', 'tr-TR': 'Turkish', 'unknown': 'Unknown'
};

const VALID_RANGES = ['hour', 'day', 'month', 'year'];
const VALID_ACTIONS = /^[a-zA-Z0-9_]+$/;

// ========== HELPER FUNCTIONS ==========

function getDbPool(req) {
    if (!req.app.locals.db) {
        console.error('❌ Database pool not available');
        throw new Error('Database pool not available.');
    }
    return req.app.locals.db;
}

const successResponse = (data, meta = null, message = null) => ({
    success: true,
    data,
    meta,
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

const validatePagination = (limit, offset) => {
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    return { limit: parsedLimit, offset: parsedOffset };
};

const validateAction = (action) => {
    if (!action) return null;
    if (typeof action !== 'string') throw new Error('Action must be a string');
    if (action.length > 50) throw new Error('Action cannot exceed 50 characters');
    if (!VALID_ACTIONS.test(action)) throw new Error('Action contains invalid characters');
    return action;
};

const logAdminAction = (userId, endpoint, params) => {
    console.log(`[ADMIN ACTION] User ${userId} accessed ${endpoint}`, {
        params,
        timestamp: new Date().toISOString()
    });
};

// ========== MIDDLEWARE ==========

const isAdmin = (req, res, next) => {
    const userRole = req.headers['x-user-role'] || req.body.userRole;
    const userId = req.headers['x-user-id'] || req.body.userId;

    if (userRole === 'admin') {
        req.authenticatedUser = { id: userId, role: userRole };
        next();
    } else {
        console.log(`❌ Admin access denied. Role: "${userRole}"`);
        res.status(403).json(errorResponse('Admin privileges required', 403));
    }
};

const statsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

router.use(statsLimiter);

// ========== ROUTES ==========

/**
 * GET /stats/account-types
 */
router.get('/account-types', isAdmin, async (req, res) => {    
    try {
        logAdminAction(req.authenticatedUser.id, '/account-types', {});

        const pool = getDbPool(req);
        const result = await pool.request().query(`
            SELECT 
                AccountType,
                COUNT(*) as count,
                CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) as percentage
            FROM Users 
            WHERE UserStatus = 'active'
            GROUP BY AccountType
            ORDER BY count DESC
        `);

        const stats = {
            total: result.recordset.reduce((sum, item) => sum + item.count, 0),
            breakdown: result.recordset.map(item => ({
                type: item.AccountType,
                count: item.count,
                percentage: parseFloat(item.percentage)
            }))
        };

        res.json(successResponse(stats, null, 'Account types retrieved successfully'));

    } catch (err) {
        console.error('❌ Error fetching account types:', err.message);
        res.status(500).json(errorResponse('Failed to fetch account statistics', 500, err.message));
    }
});

/**
 * GET /stats/languages
 */
router.get('/languages', isAdmin, async (req, res) => {
    console.log('[LANGUAGES] Fetching language statistics');
    
    try {
        logAdminAction(req.authenticatedUser.id, '/languages', {});

        const pool = getDbPool(req);
        
        const result = await pool.request().query(`
            SELECT 
                ISNULL(Language, 'unknown') AS language,
                COUNT(*) AS usage_count
            FROM UsageLogs
            WHERE Action = 'grammar_check'
            GROUP BY ISNULL(Language, 'unknown')
            ORDER BY usage_count DESC;
        `);

        if (!result.recordset || result.recordset.length === 0) {
            const emptyStats = {
                total_usage: 0,
                most_used: null,
                least_used: null,
                languages: []
            };
            return res.json(successResponse(emptyStats, null, 'No language data available'));
        }

        const totalUsage = result.recordset.reduce((sum, item) => sum + item.usage_count, 0);
        const stats = {
            total_usage: totalUsage,
            most_used: {
                language: result.recordset[0].language,
                language_name: LANGUAGE_NAMES[result.recordset[0].language] || result.recordset[0].language,
                usage_count: result.recordset[0].usage_count
            },
            least_used: {
                language: result.recordset[result.recordset.length - 1].language,
                language_name: LANGUAGE_NAMES[result.recordset[result.recordset.length - 1].language] || result.recordset[result.recordset.length - 1].language,
                usage_count: result.recordset[result.recordset.length - 1].usage_count
            },
            languages: result.recordset.map(item => ({
                language: item.language,
                language_name: LANGUAGE_NAMES[item.language] || item.language,
                usage_count: item.usage_count,
                percentage: (item.usage_count / totalUsage * 100).toFixed(2)
            }))
        };

        res.json(successResponse(stats, null, 'Language statistics retrieved successfully'));

    } catch (err) {
        console.error('❌ Error fetching language stats:', err.message);
        res.status(500).json(errorResponse('Failed to fetch language statistics', 500, err.message));
    }
});

/**
 * GET /stats/timeframe
 */
router.get('/timeframe', isAdmin, async (req, res) => {    
    try {
        const { range = 'day', action } = req.query;

        if (!VALID_RANGES.includes(range)) {
            return res.status(400).json(
                errorResponse('Invalid range. Use: hour, day, month, or year', 400)
            );
        }

        const validatedAction = validateAction(action);
        logAdminAction(req.authenticatedUser.id, '/timeframe', { range, action: validatedAction });

        const pool = getDbPool(req);
        let query = '';

        switch (range) {
            case 'hour': 
                query = `
                    SELECT 
                        DATEPART(HOUR, CreatedAt) AS period,
                        'Hour ' + CAST(DATEPART(HOUR, CreatedAt) AS VARCHAR(2)) AS period_label,
                        COUNT(LogID) AS activity_count
                    FROM UsageLogs
                    WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    ${validatedAction ? 'AND Action = @action' : ''}
                    GROUP BY DATEPART(HOUR, CreatedAt)
                    ORDER BY period;
                `;
                break;

            case 'day': 
                query = `
                    SELECT 
                        CAST(CreatedAt AS DATE) AS period,
                        FORMAT(CAST(CreatedAt AS DATE), 'MMM dd') AS period_label,
                        COUNT(LogID) AS activity_count
                    FROM UsageLogs
                    WHERE CreatedAt >= DATEADD(day, -29, GETDATE())
                    ${validatedAction ? 'AND Action = @action' : ''}
                    GROUP BY CAST(CreatedAt AS DATE)
                    ORDER BY period;
                `;
                break;

            case 'month': 
                query = `
                    SELECT 
                        YEAR(CreatedAt) * 100 + MONTH(CreatedAt) AS period,
                        DATENAME(MONTH, CreatedAt) + ' ' + CAST(YEAR(CreatedAt) AS VARCHAR) AS period_label,
                        COUNT(LogID) AS activity_count
                    FROM UsageLogs
                    WHERE CreatedAt >= DATEADD(month, -11, GETDATE())
                    ${validatedAction ? 'AND Action = @action' : ''}
                    GROUP BY YEAR(CreatedAt), MONTH(CreatedAt), DATENAME(MONTH, CreatedAt)
                    ORDER BY period;
                `;
                break;

            case 'year': 
                query = `
                    SELECT 
                        YEAR(CreatedAt) AS period,
                        CAST(YEAR(CreatedAt) AS VARCHAR(4)) AS period_label,
                        COUNT(LogID) AS activity_count
                    FROM UsageLogs
                    WHERE CreatedAt >= DATEADD(year, -4, GETDATE())
                    ${validatedAction ? 'AND Action = @action' : ''}
                    GROUP BY YEAR(CreatedAt)
                    ORDER BY period;
                `;
                break;
        }

        const request = pool.request();
        if (validatedAction) {
            request.input('action', sql.VarChar(50), validatedAction);
        }

        const result = await request.query(query);

        const stats = {
            range,
            total_activity: result.recordset.reduce((sum, item) => sum + item.activity_count, 0),
            data: result.recordset.map(item => ({
                period: item.period_label,
                count: item.activity_count
            }))
        };

        res.json(successResponse(stats, null, 'Timeframe statistics retrieved successfully'));

    } catch (err) {
        console.error('❌ Error fetching timeframe stats:', err.message);
        console.error('Stack:', err.stack);
        const statusCode = err.message.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json(errorResponse(err.message, statusCode, err.stack));
    }
});

/**
 * GET /stats/overview
 */
router.get('/overview', isAdmin, async (req, res) => {    
    try {
        logAdminAction(req.authenticatedUser.id, '/overview', {});

        const pool = getDbPool(req);
        const result = await pool.request().query(`
            SELECT 'total_users' as stat_type, COUNT(*) as value
            FROM Users
            
            UNION ALL
            
            SELECT 'active_users' as stat_type, COUNT(*) as value
            FROM Users WHERE UserStatus = 'active'
            
            UNION ALL
            
            SELECT 'total_notifications' as stat_type, COUNT(*) as value
            FROM Notifications
            
            UNION ALL
            
            SELECT 'unread_notifications' as stat_type, COUNT(*) as value
            FROM Notifications WHERE IsRead = 0
            
            UNION ALL
            
            SELECT 'new_users_today' as stat_type, COUNT(*) as value
            FROM Users WHERE CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
            
            UNION ALL
            
            SELECT 'new_users_this_month' as stat_type, COUNT(*) as value
            FROM Users 
            WHERE YEAR(CreatedAt) = YEAR(GETDATE()) 
            AND MONTH(CreatedAt) = MONTH(GETDATE())
        `);

        const stats = {};
        result.recordset.forEach(row => {
            stats[row.stat_type] = row.value;
        });

        res.json(successResponse(stats, null, 'Overview statistics retrieved successfully'));

    } catch (err) {
        console.error('❌ Error fetching overview stats:', err.message);
        res.status(500).json(errorResponse('Failed to fetch overview statistics', 500, err.message));
    }
});

/**
 * GET /stats/export
 */
router.get('/export', isAdmin, async (req, res) => {    
    try {
        const { limit, offset } = req.query;
        const { limit: validLimit, offset: validOffset } = validatePagination(limit, offset);

        logAdminAction(req.authenticatedUser.id, '/export', { limit: validLimit, offset: validOffset });

        const pool = getDbPool(req);
        const result = await pool.request()
            .input('limit', sql.Int, validLimit)
            .input('offset', sql.Int, validOffset)
            .query(`
                SELECT 
                    u.UserID,
                    u.Username,
                    u.Email,
                    u.UserRole,
                    u.AccountType,
                    u.UserStatus,
                    u.CreatedAt,
                    COUNT(n.NotificationID) as NotificationCount,
                    SUM(CASE WHEN n.IsRead = 0 THEN 1 ELSE 0 END) as UnreadNotifications
                FROM Users u
                LEFT JOIN Notifications n ON u.UserID = n.UserID
                GROUP BY u.UserID, u.Username, u.Email, u.UserRole, u.AccountType, u.UserStatus, u.CreatedAt
                ORDER BY u.CreatedAt DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        const exportData = {
            export_date: new Date().toISOString(),
            total_records: result.recordset.length,
            pagination: {
                limit: validLimit,
                offset: validOffset
            },
            data: result.recordset.map(row => ({
                user_id: row.UserID,
                username: row.Username,
                email: row.Email,
                role: row.UserRole,
                account_type: row.AccountType,
                status: row.UserStatus,
                created_at: row.CreatedAt?.toISOString(),
                notification_count: row.NotificationCount || 0,
                unread_notifications: row.UnreadNotifications || 0
            }))
        };

        res.json(successResponse(exportData, null, 'Export data retrieved successfully'));

    } catch (err) {
        console.error('❌ Error exporting stats:', err.message);
        res.status(500).json(errorResponse('Failed to export statistics', 500, err.message));
    }
});

/**
 * GET /stats/health
 */
router.get('/health', isAdmin, async (req, res) => {    
    try {
        const pool = getDbPool(req);
        const result = await pool.request().query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT UserID) as unique_users
            FROM UsageLogs;
        `);

        res.json(successResponse({
            status: 'healthy',
            database: 'connected',
            total_logs: result.recordset[0].total_records,
            unique_users: result.recordset[0].unique_users
        }, null, 'Health check passed'));

    } catch (err) {
        console.error('❌ Health check failed:', err.message);
        res.status(503).json(errorResponse('Service unavailable', 503, err.message));
    }
});

export default router;