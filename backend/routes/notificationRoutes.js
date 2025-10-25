import express from 'express';
import sql from 'mssql';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ========== HELPER FUNCTIONS ==========

function getDbPool(req) {
    if (!req.app.locals.db) {
        console.error('❌ Database pool not available');
        throw new Error('Database pool not available.');
    }
    return req.app.locals.db;
}

// Validate pagination parameters
const validatePagination = (limit, offset) => {
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    return { limit: parsedLimit, offset: parsedOffset };
};

// Validate date range
const validateDateRange = (dateFrom, dateTo) => {
    if (dateFrom) {
        const from = new Date(dateFrom);
        if (isNaN(from.getTime())) {
            throw new Error('Invalid dateFrom format. Use ISO format (YYYY-MM-DD)');
        }
    }
    if (dateTo) {
        const to = new Date(dateTo);
        if (isNaN(to.getTime())) {
            throw new Error('Invalid dateTo format. Use ISO format (YYYY-MM-DD)');
        }
    }
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        throw new Error('dateFrom cannot be after dateTo');
    }
};

// Parse notification record
const parseNotification = (record) => ({
    ...record,
    metadata: record.Metadata ? JSON.parse(record.Metadata) : {},
    isRead: !!record.IsRead,
    readAt: record.ReadAt || null,
    createdAt: record.CreatedAt?.toISOString()
});

// Standard response format
const successResponse = (data, meta = null, message = null) => ({
    success: true,
    data,
    meta,
    message,
    timestamp: new Date().toISOString()
});

const errorResponse = (error) => ({
    success: false,
    error,
    timestamp: new Date().toISOString()
});

// ========== MIDDLEWARE ==========

// Admin authorization
const isAdmin = (req, res, next) => {
    console.log('🔐 Checking admin authorization...');
    const userRole = req.headers['x-user-role'] || req.body.userRole;

    if (userRole === 'admin') {
        console.log('✅ Admin access granted');
        next();
    } else {
        console.log(`❌ Admin access denied. Role: "${userRole}"`);
        return res.status(403).json(errorResponse('Admin privileges required'));
    }
};

// Authentication check
const requireAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.params.userId;
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole) {
        return res.status(401).json(errorResponse('Authentication required'));
    }

    req.authenticatedUser = {
        id: parseInt(userId),
        role: userRole
    };

    next();
};

// User authorization - check if user can access their own data
const authorizeUser = (req, res, next) => {
    const targetUserId = parseInt(req.params.userId);

    if (req.authenticatedUser.role !== 'admin' && req.authenticatedUser.id !== targetUserId) {
        return res.status(403).json(
            errorResponse('Access denied. You can only access your own notifications.')
        );
    }

    next();
};

// Rate limiting
const notificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

router.use(notificationLimiter);

// ========== INTERNAL FUNCTIONS ==========

/**
 * Create notification (called when admin updates user)
 */
export const createNotification = async (pool, notificationData) => {
    try {
        const request = pool.request();

        const query = `
            INSERT INTO Notifications (
                UserID, Title, Message, Type, IsRead, 
                AdminAction, AdminID, Metadata, CreatedAt
            )
            VALUES (
                @UserID, @Title, @Message, @Type, 0,
                @AdminAction, @AdminID, @Metadata, GETDATE()
            );
            SELECT SCOPE_IDENTITY() as NotificationID;
        `;

        request.input('UserID', sql.Int, notificationData.userID);
        request.input('Title', sql.NVarChar(255), notificationData.title);
        request.input('Message', sql.NVarChar(500), notificationData.message);
        request.input('Type', sql.VarChar(50), notificationData.type || 'profile_update');
        request.input('AdminAction', sql.NVarChar(100), notificationData.adminAction);
        request.input('AdminID', sql.Int, notificationData.adminID);
        request.input('Metadata', sql.NVarChar(sql.MAX), JSON.stringify(notificationData.metadata || {}));

        const result = await request.query(query);
        const notificationId = result.recordset[0].NotificationID;

        console.log('✅ Notification created:', { id: notificationId, userID: notificationData.userID });
        return { success: true, notificationId };
    } catch (err) {
        console.error('❌ Error creating notification:', err);
        throw err;
    }
};

// ========== ROUTES ==========

/**
 * GET /notifications/user/:userId
 * Get all notifications for a user with pagination
 */
router.get('/user/:userId', requireAuth, authorizeUser, async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { limit, offset, unreadOnly = false } = req.query;

    console.log(`📱 Fetching notifications for user ${userId}`);

    try {
        const { limit: validLimit, offset: validOffset } = validatePagination(limit, offset);
        const pool = getDbPool(req);

        let whereClause = 'WHERE n.UserID = @userId';
        if (unreadOnly === 'true') {
            whereClause += ' AND n.IsRead = 0';
        }

        // Combined query to get notifications and unread count in one go
        const query = `
            SELECT 
                n.NotificationID,
                n.UserID,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.AdminAction,
                n.AdminID,
                u.Username as AdminUsername,
                u.fullName as AdminName,
                n.Metadata,
                n.CreatedAt,
                n.ReadAt,
                (SELECT COUNT(*) FROM Notifications WHERE UserID = @userId AND IsRead = 0) as UnreadCount
            FROM Notifications n
            LEFT JOIN Users u ON n.AdminID = u.UserID
            ${whereClause}
            ORDER BY n.CreatedAt DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('limit', sql.Int, validLimit)
            .input('offset', sql.Int, validOffset)
            .query(query);

        const notifications = result.recordset.map(parseNotification);
        const unreadCount = result.recordset.length > 0 ? result.recordset[0].UnreadCount : 0;

        res.json(successResponse(notifications, {
            total: notifications.length,
            unreadCount,
            limit: validLimit,
            offset: validOffset
        }, 'Notifications retrieved successfully'));

    } catch (err) {
        console.error('❌ Error fetching notifications:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * PATCH /notifications/:notificationId/read
 * Mark a single notification as read
 */
router.patch('/:notificationId/read', requireAuth, async (req, res) => {
    const notificationId = parseInt(req.params.notificationId);

    console.log(`✅ Marking notification ${notificationId} as read`);

    try {
        const pool = getDbPool(req);

        // Check ownership and update in single query
        const query = `
            UPDATE Notifications 
            SET IsRead = 1, ReadAt = GETDATE()
            OUTPUT inserted.UserID
            WHERE NotificationID = @notificationId 
            AND IsRead = 0
            AND UserID IN (
                SELECT @userId WHERE @userRole = 'admin'
                UNION ALL
                SELECT @userId WHERE @userRole != 'admin' AND UserID = @userId
            );
        `;

        const result = await pool.request()
            .input('notificationId', sql.Int, notificationId)
            .input('userId', sql.Int, req.authenticatedUser.id)
            .input('userRole', sql.VarChar(20), req.authenticatedUser.role)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json(errorResponse('Notification not found or already read'));
        }

        res.json(successResponse(null, null, 'Notification marked as read'));

    } catch (err) {
        console.error('❌ Error marking notification as read:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * PATCH /notifications/user/:userId/mark-all-read
 * Mark all notifications as read for a user
 */
router.patch('/user/:userId/mark-all-read', requireAuth, authorizeUser, async (req, res) => {
    const userId = parseInt(req.params.userId);

    console.log(`✅ Marking all notifications as read for user ${userId}`);

    try {
        const pool = getDbPool(req);

        const query = `
            UPDATE Notifications 
            SET IsRead = 1, ReadAt = GETDATE()
            WHERE UserID = @userId AND IsRead = 0;
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        res.json(successResponse(null, null, `${result.rowsAffected[0]} notifications marked as read`));

    } catch (err) {
        console.error('❌ Error marking all notifications as read:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * DELETE /notifications/:notificationId
 * Delete a single notification
 */
router.delete('/:notificationId', requireAuth, async (req, res) => {
    const notificationId = parseInt(req.params.notificationId);

    console.log(`🗑️ Deleting notification ${notificationId}`);

    try {
        const pool = getDbPool(req);

        const query = `
            DELETE FROM Notifications 
            OUTPUT deleted.UserID
            WHERE NotificationID = @notificationId
            AND (
                @userRole = 'admin' 
                OR UserID = @userId
            );
        `;

        const result = await pool.request()
            .input('notificationId', sql.Int, notificationId)
            .input('userId', sql.Int, req.authenticatedUser.id)
            .input('userRole', sql.VarChar(20), req.authenticatedUser.role)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json(errorResponse('Notification not found'));
        }

        res.json(successResponse(null, null, 'Notification deleted successfully'));

    } catch (err) {
        console.error('❌ Error deleting notification:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * DELETE /notifications/user/:userId/delete-all
 * Delete all notifications for a user
 */
router.delete('/user/:userId/delete-all', requireAuth, authorizeUser, async (req, res) => {
    const userId = parseInt(req.params.userId);

    console.log(`🗑️ Deleting all notifications for user ${userId}`);

    try {
        const pool = getDbPool(req);

        const query = `
            DELETE FROM Notifications WHERE UserID = @userId;
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        res.json(successResponse(null, null, `${result.rowsAffected[0]} notifications deleted`));

    } catch (err) {
        console.error('❌ Error deleting all notifications:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * GET /notifications/languages
 * Get all supported notification types
 */
router.get('/types', async (req, res) => {
    try {
        const notificationTypes = [
            { type: 'profile_update', description: 'Profile information updated' },
            { type: 'status_change', description: 'Account status changed' },
            { type: 'security_alert', description: 'Security-related alert' },
            { type: 'system_message', description: 'System notification' }
        ];

        res.json(successResponse(notificationTypes, null, 'Notification types retrieved'));

    } catch (err) {
        console.error('❌ Error fetching notification types:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * GET /notifications/admin/sent/:adminId
 * Get notifications sent by a specific admin with filtering
 */
router.get('/admin/sent/:adminId', isAdmin, async (req, res) => {
    const adminId = parseInt(req.params.adminId);
    const { limit, offset, dateFrom, dateTo } = req.query;

    console.log(`👨‍💼 Admin ${adminId} fetching sent notifications`);

    try {
        validateDateRange(dateFrom, dateTo);
        const { limit: validLimit, offset: validOffset } = validatePagination(limit, offset);
        const pool = getDbPool(req);

        let whereClause = 'WHERE n.AdminID = @adminId';
        const request = pool.request().input('adminId', sql.Int, adminId);

        if (dateFrom) {
            whereClause += ' AND n.CreatedAt >= @dateFrom';
            request.input('dateFrom', sql.DateTime, new Date(dateFrom));
        }

        if (dateTo) {
            whereClause += ' AND n.CreatedAt <= @dateTo';
            request.input('dateTo', sql.DateTime, new Date(dateTo));
        }

        const query = `
            SELECT 
                n.NotificationID,
                n.UserID,
                u.Username,
                u.fullName as UserName,
                u.Email as UserEmail,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.AdminAction,
                n.CreatedAt,
                n.ReadAt
            FROM Notifications n
            INNER JOIN Users u ON n.UserID = u.UserID
            ${whereClause}
            ORDER BY n.CreatedAt DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;

            SELECT 
                COUNT(*) as totalSent,
                SUM(CASE WHEN IsRead = 1 THEN 1 ELSE 0 END) as readCount,
                SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as unreadCount
            FROM Notifications 
            ${whereClause};
        `;

        request.input('limit', sql.Int, validLimit);
        request.input('offset', sql.Int, validOffset);

        const result = await request.query(query);
        const notifications = result.recordsets[0].map(parseNotification);
        const stats = result.recordsets[1][0];

        res.json(successResponse(notifications, { ...stats, limit: validLimit, offset: validOffset }, 
            'Admin sent notifications retrieved'));

    } catch (err) {
        console.error('❌ Error fetching admin notifications:', err);
        res.status(err.message.includes('Invalid') ? 400 : 500)
            .json(errorResponse(err.message));
    }
});

/**
 * DELETE /notifications/cleanup
 * Delete old notifications (older than specified days)
 */
router.delete('/cleanup', isAdmin, async (req, res) => {
    const { days = 3 } = req.body;

    if (typeof days !== 'number' || days < 1) {
        return res.status(400).json(errorResponse('Days must be a positive number'));
    }

    console.log(`🧹 Starting cleanup of notifications older than ${days} days`);

    try {
        const pool = getDbPool(req);

        const query = `
            DELETE FROM Notifications 
            WHERE CreatedAt < DATEADD(day, -@days, GETDATE());
        `;

        const result = await pool.request()
            .input('days', sql.Int, days)
            .query(query);

        console.log(`🧹 Cleanup completed. Deleted ${result.rowsAffected[0]} old notifications`);

        res.json(successResponse(null, null, `${result.rowsAffected[0]} notifications deleted`));

    } catch (err) {
        console.error('❌ Error during cleanup:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * GET /notifications/admin/stats
 * Get notification statistics for admin dashboard
 */
router.get('/admin/stats', isAdmin, async (req, res) => {
    console.log('📊 Fetching notification statistics');

    try {
        const pool = getDbPool(req);

        const query = `
            SELECT 
                COUNT(*) as totalNotifications,
                SUM(CASE WHEN IsRead = 1 THEN 1 ELSE 0 END) as readNotifications,
                SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as unreadNotifications,
                COUNT(DISTINCT UserID) as usersWithNotifications,
                COUNT(DISTINCT AdminID) as adminsWhoSent
            FROM Notifications;

            SELECT 
                Type,
                COUNT(*) as count,
                SUM(CASE WHEN IsRead = 1 THEN 1 ELSE 0 END) as readCount
            FROM Notifications
            GROUP BY Type
            ORDER BY count DESC;

            SELECT TOP 10
                u.UserID,
                u.Username,
                u.fullName,
                COUNT(*) as notificationCount,
                SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as unreadCount
            FROM Notifications n
            INNER JOIN Users u ON n.UserID = u.UserID
            GROUP BY u.UserID, u.Username, u.fullName
            ORDER BY notificationCount DESC;
        `;

        const result = await pool.request().query(query);

        res.json(successResponse({
            overview: result.recordsets[0][0],
            byType: result.recordsets[1],
            topUsers: result.recordsets[2]
        }, null, 'Notification statistics retrieved'));

    } catch (err) {
        console.error('❌ Error fetching notification stats:', err);
        res.status(500).json(errorResponse(err.message));
    }
});

/**
 * GET /notifications/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    console.log('[HEALTH CHECK] Notification service health check');

    try {
        const pool = getDbPool(req);
        const result = await pool.request()
            .query('SELECT COUNT(*) as totalNotifications FROM Notifications;');

        res.json(successResponse({
            status: 'healthy',
            totalNotifications: result.recordset[0].totalNotifications
        }, null, 'Health check passed'));

    } catch (err) {
        console.error('❌ Health check failed:', err);
        res.status(503).json(errorResponse('Service unavailable'));
    }
});

export default router;