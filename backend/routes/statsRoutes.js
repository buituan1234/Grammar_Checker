// backend/routes/statsRoutes.js
import express from 'express';
import sql from 'mssql';

const router = express.Router();

// Utility function to get database pool
function getDbPool(req) {
    if (!req.app.locals.db) {
        console.error('Database pool not available in req.app.locals.db');
        throw new Error('Database pool not available.');
    }
    return req.app.locals.db;
}

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    const userRole = req.headers['x-user-role'] || req.body.userRole;
    if (userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            success: false, 
            error: 'Access denied. Admin privileges required.'
        });
    }
};

// GET /api/stats/account-types - Account type statistics
router.get('/account-types', isAdmin, async (req, res) => {
    try {
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

        res.json({
            success: true,
            data: stats
        });

    } catch (err) {
        console.error('Error fetching account type stats:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching account statistics.'
        });
    }
});

// GET /api/stats/languages - Language usage statistics
router.get('/languages', isAdmin, async (req, res) => {
    try {
        const pool = getDbPool(req);
        
        // Note: This assumes you have a GrammarChecks table or similar
        // If not, we'll create mock data for now
        const result = await pool.request().query(`
            SELECT 
                'en-US' as language, 'English (US)' as language_name, 450 as usage_count
            UNION ALL
            SELECT 'vi' as language, 'Vietnamese' as language_name, 120 as usage_count
            UNION ALL
            SELECT 'fr' as language, 'French' as language_name, 80 as usage_count
            UNION ALL
            SELECT 'de' as language, 'German' as language_name, 65 as usage_count
            UNION ALL
            SELECT 'es' as language, 'Spanish' as language_name, 55 as usage_count
            UNION ALL
            SELECT 'ja-JP' as language, 'Japanese' as language_name, 30 as usage_count
            ORDER BY usage_count DESC
        `);

        const totalUsage = result.recordset.reduce((sum, item) => sum + item.usage_count, 0);
        
        const stats = {
            total_usage: totalUsage,
            most_used: result.recordset[0],
            least_used: result.recordset[result.recordset.length - 1],
            languages: result.recordset.map(item => ({
                language: item.language,
                language_name: item.language_name,
                usage_count: item.usage_count,
                percentage: ((item.usage_count / totalUsage) * 100).toFixed(2)
            }))
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (err) {
        console.error('Error fetching language stats:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching language statistics.'
        });
    }
});

// GET /api/stats/timeframe?range=hour|day|month|year - Traffic statistics
router.get('/timeframe', isAdmin, async (req, res) => {
    try {
        const { range = 'day' } = req.query;
        const pool = getDbPool(req);
        
        let query = '';
        let groupBy = '';
        let orderBy = '';
        
        switch (range) {
            case 'hour':
                query = `
                    SELECT 
                        DATEPART(HOUR, CreatedAt) as period,
                        'Hour ' + CAST(DATEPART(HOUR, CreatedAt) AS VARCHAR(2)) as period_label,
                        COUNT(*) as activity_count
                    FROM Users 
                    WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    GROUP BY DATEPART(HOUR, CreatedAt)
                    ORDER BY period
                `;
                break;
                
            case 'day':
                query = `
                    SELECT 
                        CAST(CreatedAt AS DATE) as period,
                        FORMAT(CreatedAt, 'MMM dd') as period_label,
                        COUNT(*) as activity_count
                    FROM Users 
                    WHERE CreatedAt >= DATEADD(day, -30, GETDATE())
                    GROUP BY CAST(CreatedAt AS DATE)
                    ORDER BY period
                `;
                break;
                
            case 'month':
                query = `
                    SELECT 
                        YEAR(CreatedAt) * 100 + MONTH(CreatedAt) as period,
                        FORMAT(CreatedAt, 'MMM yyyy') as period_label,
                        COUNT(*) as activity_count
                    FROM Users 
                    WHERE CreatedAt >= DATEADD(month, -12, GETDATE())
                    GROUP BY YEAR(CreatedAt), MONTH(CreatedAt)
                    ORDER BY period
                `;
                break;
                
            case 'year':
                query = `
                    SELECT 
                        YEAR(CreatedAt) as period,
                        CAST(YEAR(CreatedAt) AS VARCHAR(4)) as period_label,
                        COUNT(*) as activity_count
                    FROM Users 
                    GROUP BY YEAR(CreatedAt)
                    ORDER BY period
                `;
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid range. Use: hour, day, month, or year'
                });
        }
        
        const result = await pool.request().query(query);
        
        const stats = {
            range: range,
            total_activity: result.recordset.reduce((sum, item) => sum + item.activity_count, 0),
            data: result.recordset.map(item => ({
                period: item.period_label,
                count: item.activity_count
            }))
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (err) {
        console.error('Error fetching timeframe stats:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching timeframe statistics.'
        });
    }
});

// GET /api/stats/overview - Dashboard overview stats
router.get('/overview', isAdmin, async (req, res) => {
    try {
        const pool = getDbPool(req);
        
        // Get multiple statistics in one go
        const result = await pool.request().query(`
            -- Total users by status
            SELECT 'total_users' as stat_type, COUNT(*) as value
            FROM Users
            
            UNION ALL
            
            -- Active users
            SELECT 'active_users' as stat_type, COUNT(*) as value
            FROM Users WHERE UserStatus = 'active'
            
            UNION ALL
            
            -- Total notifications
            SELECT 'total_notifications' as stat_type, COUNT(*) as value
            FROM Notifications
            
            UNION ALL
            
            -- Unread notifications
            SELECT 'unread_notifications' as stat_type, COUNT(*) as value
            FROM Notifications WHERE IsRead = 0
            
            UNION ALL
            
            -- Users created today
            SELECT 'new_users_today' as stat_type, COUNT(*) as value
            FROM Users WHERE CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
            
            UNION ALL
            
            -- Users created this month
            SELECT 'new_users_this_month' as stat_type, COUNT(*) as value
            FROM Users 
            WHERE YEAR(CreatedAt) = YEAR(GETDATE()) 
            AND MONTH(CreatedAt) = MONTH(GETDATE())
        `);

        // Transform result into object
        const stats = {};
        result.recordset.forEach(row => {
            stats[row.stat_type] = row.value;
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (err) {
        console.error('Error fetching overview stats:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching overview statistics.'
        });
    }
});

// GET /api/stats/export - Export statistics to Excel
router.get('/export', isAdmin, async (req, res) => {
    try {
        const pool = getDbPool(req);
        
        // Get comprehensive data for export
        const result = await pool.request().query(`
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
        `);

        // Format data for export
        const exportData = {
            export_date: new Date().toISOString(),
            total_records: result.recordset.length,
            data: result.recordset.map(row => ({
                user_id: row.UserID,
                username: row.Username,
                email: row.Email,
                role: row.UserRole,
                account_type: row.AccountType,
                status: row.UserStatus,
                created_at: row.CreatedAt,
                notification_count: row.NotificationCount,
                unread_notifications: row.UnreadNotifications
            }))
        };

        res.json({
            success: true,
            data: exportData
        });

    } catch (err) {
        console.error('Error exporting stats:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error exporting statistics.'
        });
    }
});

export default router;