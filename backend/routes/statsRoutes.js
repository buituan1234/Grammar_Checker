// backend/routes/statsRoutes.js
import express from 'express';

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

    // Thống kê số lần sử dụng theo ngôn ngữ từ bảng UsageLogs
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
      return res.json({
        success: true,
        data: {
          total_usage: 0,
          most_used: null,
          least_used: null,
          languages: []
        }
      });
    }

    // Bản đồ ngôn ngữ -> tên hiển thị
    const languageMap = {
      'en-US': 'English (US)',
      'vi': 'Vietnamese',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'ja-JP': 'Japanese',
      'unknown': 'Unknown'
    };

    const totalUsage = result.recordset.reduce((sum, item) => sum + item.usage_count, 0);

    const stats = {
      total_usage: totalUsage,
      most_used: {
        ...result.recordset[0],
        language_name: languageMap[result.recordset[0].language] || result.recordset[0].language
      },
      least_used: {
        ...result.recordset[result.recordset.length - 1],
        language_name: languageMap[result.recordset[result.recordset.length - 1].language] || result.recordset[result.recordset.length - 1].language
      },
      languages: result.recordset.map(item => ({
        language: item.language,
        language_name: languageMap[item.language] || item.language,
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
      error: 'Internal server error fetching language statistics: ' + err.message
    });
  }
});

// GET /api/stats/timeframe?range=hour|day|month|year&action=login
router.get('/timeframe', isAdmin, async (req, res) => {
  try {
    const { range = 'day', action } = req.query;
    const pool = getDbPool(req);

    if (!['hour', 'day', 'month', 'year'].includes(range)) {
      return res.status(400).json({
        success: false,
        error: "Invalid range. Use: hour, day, month, or year"
      });
    }

    // Nếu có action thì lọc, ví dụ action=login
    const actionFilter = action ? `AND u.Action = '${action}'` : '';

    let query = '';

    switch (range) {
      case 'hour': 
        query = `
          ;WITH Hours AS (
            SELECT 0 AS h UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
            UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
            UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
            UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
            UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
          )
          SELECT 
            h AS period,
            'Hour ' + CAST(h AS VARCHAR(2)) AS period_label,
            COUNT(u.LogID) AS activity_count
          FROM Hours h
          LEFT JOIN UsageLogs u
            ON DATEPART(HOUR, u.CreatedAt) = h.h
           AND u.CreatedAt >= DATEADD(day, -1, GETDATE())
           ${actionFilter}
          GROUP BY h
          ORDER BY h;
        `;
        break;

      case 'day': 
        query = `
          ;WITH Days AS (
            SELECT CAST(GETDATE() AS DATE) AS d
            UNION ALL
            SELECT DATEADD(DAY, -1, d) FROM Days WHERE d > DATEADD(DAY, -29, GETDATE())
          )
          SELECT 
            d AS period,
            FORMAT(d, 'MMM dd') AS period_label,
            COUNT(u.LogID) AS activity_count
          FROM Days
          LEFT JOIN UsageLogs u
            ON CAST(u.CreatedAt AS DATE) = d
           ${actionFilter}
          GROUP BY d
          ORDER BY d;
        `;
        break;

      case 'month': 
        query = `
          ;WITH Months AS (
            SELECT DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) AS m
            UNION ALL
            SELECT DATEADD(MONTH, -1, m) FROM Months WHERE m > DATEADD(MONTH, -11, GETDATE())
          )
          SELECT 
            YEAR(m) * 100 + MONTH(m) AS period,
            FORMAT(m, 'MMM yyyy') AS period_label,
            COUNT(u.LogID) AS activity_count
          FROM Months
          LEFT JOIN UsageLogs u
            ON YEAR(u.CreatedAt) = YEAR(m) 
           AND MONTH(u.CreatedAt) = MONTH(m)
           ${actionFilter}
          GROUP BY m
          ORDER BY m;
        `;
        break;

      case 'year': 
        query = `
          ;WITH Years AS (
            SELECT YEAR(GETDATE()) AS y
            UNION ALL
            SELECT y - 1 FROM Years WHERE y > YEAR(GETDATE()) - 4
          )
          SELECT 
            y AS period,
            CAST(y AS VARCHAR(4)) AS period_label,
            COUNT(u.LogID) AS activity_count
          FROM Years
          LEFT JOIN UsageLogs u
            ON YEAR(u.CreatedAt) = y
           ${actionFilter}
          GROUP BY y
          ORDER BY y;
        `;
        break;
    }

    const result = await pool.request().query(query);

    const stats = {
      range,
      total_activity: result.recordset.reduce((sum, item) => sum + item.activity_count, 0),
      data: result.recordset.map(item => ({
        period: item.period_label,
        count: item.activity_count
      }))
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Error fetching timeframe stats:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching timeframe statistics: ' + err.message
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