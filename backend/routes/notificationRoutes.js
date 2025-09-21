// backend/routes/notificationRoutes.js
import express from 'express';
import sql from 'mssql';

const router = express.Router();

// Utility function to get database pool (same pattern as userRoutes.js)
function getDbPool(req) {
    if (!req.app.locals.db) {
        console.error('❌ Database pool not available in req.app.locals.db');
        throw new Error('Database pool not available.');
    }
    console.log('✅ Database pool retrieved successfully');
    return req.app.locals.db;
}

// Middleware to check if user is admin (same as userRoutes.js)
const isAdmin = (req, res, next) => {
    console.log('🔐 Admin middleware - checking authorization...');
    const userRole = req.headers['x-user-role'] || req.body.userRole;
    console.log(`🔍 Extracted user role: "${userRole}"`);

    if (userRole === 'admin') {
        console.log('✅ Admin access granted');
        next();
    } else {
        console.log(`❌ Admin access denied. Role: "${userRole}"`);
        res.status(403).json({ 
            success: false, 
            error: 'Access denied. Admin privileges required.',
            receivedRole: userRole,
            expectedRole: 'admin'
        });
    }
};

// Middleware to check authentication (basic auth check)
const requireAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.params.userId;
    const userRole = req.headers['x-user-role'];
    
    if (!userId || !userRole) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Missing user credentials.'
        });
    }
    
    // Store in req for later use
    req.authenticatedUser = {
        id: parseInt(userId),
        role: userRole
    };
    
    next();
};

// 🔔 CREATE NOTIFICATION (Internal function - called when admin updates user)
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

        console.log('✅ Notification created successfully:', {
            id: notificationId,
            userID: notificationData.userID,
            type: notificationData.type
        });

        return { success: true, notificationId };

    } catch (err) {
        console.error('❌ Error creating notification:', err);
        throw err;
    }
};

// 📱 GET USER NOTIFICATIONS - Get all notifications for a specific user
router.get('/user/:userId', requireAuth, async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    // Security check: users can only see their own notifications
    if (req.authenticatedUser.role !== 'admin' && req.authenticatedUser.id !== userId) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. You can only view your own notifications.'
        });
    }

    console.log(`📱 Fetching notifications for user ${userId}`, { limit, offset, unreadOnly });

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        let whereClause = 'WHERE n.UserID = @userId';
        if (unreadOnly === 'true') {
            whereClause += ' AND n.IsRead = 0';
        }

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
                n.ReadAt
            FROM Notifications n
            LEFT JOIN Users u ON n.AdminID = u.UserID
            ${whereClause}
            ORDER BY n.CreatedAt DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;
        `;

        request.input('userId', sql.Int, userId);
        request.input('limit', sql.Int, parseInt(limit));
        request.input('offset', sql.Int, parseInt(offset));

        const result = await request.query(query);

        // Get unread count
        const countQuery = `
            SELECT COUNT(*) as unreadCount 
            FROM Notifications 
            WHERE UserID = @userId AND IsRead = 0;
        `;
        
        const countResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(countQuery);

        const notifications = result.recordset.map(notification => ({
            ...notification,
            Metadata: notification.Metadata ? JSON.parse(notification.Metadata) : {}
        }));

        res.json({
            success: true,
            notifications,
            meta: {
                total: result.recordset.length,
                unreadCount: countResult.recordset[0].unreadCount,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (err) {
        console.error('❌ Error fetching notifications:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching notifications.',
            details: err.message
        });
    }
});

// ✅ MARK NOTIFICATION AS READ
router.patch('/:notificationId/read', requireAuth, async (req, res) => {
    const notificationId = parseInt(req.params.notificationId);

    console.log(`✅ Marking notification ${notificationId} as read`);

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        // First, check if notification belongs to the authenticated user (security)
        const checkQuery = `
            SELECT UserID FROM Notifications WHERE NotificationID = @notificationId;
        `;

        request.input('notificationId', sql.Int, notificationId);
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found.'
            });
        }

        const notificationUserId = checkResult.recordset[0].UserID;

        // Security check: users can only mark their own notifications as read
        if (req.authenticatedUser.role !== 'admin' && req.authenticatedUser.id !== notificationUserId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only modify your own notifications.'
            });
        }

        // Update notification as read
        const updateQuery = `
            UPDATE Notifications 
            SET IsRead = 1, ReadAt = GETDATE()
            WHERE NotificationID = @notificationId AND IsRead = 0;
        `;

        const updateResult = await pool.request()
            .input('notificationId', sql.Int, notificationId)
            .query(updateQuery);

        if (updateResult.rowsAffected[0] > 0) {
            res.json({
                success: true,
                message: 'Notification marked as read successfully.'
            });
        } else {
            res.json({
                success: true,
                message: 'Notification was already marked as read.'
            });
        }

    } catch (err) {
        console.error('❌ Error marking notification as read:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error updating notification.',
            details: err.message
        });
    }
});

// ✅ MARK ALL NOTIFICATIONS AS READ FOR A USER
router.patch('/user/:userId/mark-all-read', requireAuth, async (req, res) => {
    const userId = parseInt(req.params.userId);

    // Security check: users can only mark their own notifications
    if (req.authenticatedUser.role !== 'admin' && req.authenticatedUser.id !== userId) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. You can only modify your own notifications.'
        });
    }

    console.log(`✅ Marking all notifications as read for user ${userId}`);

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        const query = `
            UPDATE Notifications 
            SET IsRead = 1, ReadAt = GETDATE()
            WHERE UserID = @userId AND IsRead = 0;
        `;

        request.input('userId', sql.Int, userId);
        const result = await request.query(query);

        res.json({
            success: true,
            message: `${result.rowsAffected[0]} notifications marked as read.`,
            markedCount: result.rowsAffected[0]
        });

    } catch (err) {
        console.error('❌ Error marking all notifications as read:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error updating notifications.',
            details: err.message
        });
    }
});

// 👨‍💼 ADMIN: Get notifications sent by specific admin
router.get('/admin/sent/:adminId', isAdmin, async (req, res) => {
    const adminId = parseInt(req.params.adminId);
    const { limit = 100, offset = 0, dateFrom, dateTo } = req.query;

    console.log(`👨‍💼 Admin ${adminId} fetching sent notifications`);

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        let whereClause = 'WHERE n.AdminID = @adminId';
        
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
        `;

        request.input('adminId', sql.Int, adminId);
        request.input('limit', sql.Int, parseInt(limit));
        request.input('offset', sql.Int, parseInt(offset));

        const result = await request.query(query);

        // Get stats
        const statsQuery = `
            SELECT 
                COUNT(*) as totalSent,
                SUM(CASE WHEN IsRead = 1 THEN 1 ELSE 0 END) as readCount,
                SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as unreadCount
            FROM Notifications 
            WHERE AdminID = @adminId
            ${dateFrom ? 'AND CreatedAt >= @dateFrom' : ''}
            ${dateTo ? 'AND CreatedAt <= @dateTo' : ''};
        `;

        const statsRequest = pool.request().input('adminId', sql.Int, adminId);
        if (dateFrom) statsRequest.input('dateFrom', sql.DateTime, new Date(dateFrom));
        if (dateTo) statsRequest.input('dateTo', sql.DateTime, new Date(dateTo));
        
        const statsResult = await statsRequest.query(statsQuery);

        res.json({
            success: true,
            notifications: result.recordset,
            stats: statsResult.recordset[0],
            meta: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (err) {
        console.error('❌ Error fetching admin sent notifications:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching admin notifications.',
            details: err.message
        });
    }
});

// 🧹 CLEANUP OLD NOTIFICATIONS (older than 3 days)
router.delete('/cleanup', isAdmin, async (req, res) => {
    console.log('🧹 Starting notification cleanup (older than 3 days)');

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        const query = `
            DELETE FROM Notifications 
            WHERE CreatedAt < DATEADD(day, -3, GETDATE());
        `;

        const result = await request.query(query);

        console.log(`🧹 Cleanup completed. Deleted ${result.rowsAffected[0]} old notifications`);

        res.json({
            success: true,
            message: `Cleanup completed. ${result.rowsAffected[0]} old notifications deleted.`,
            deletedCount: result.rowsAffected[0]
        });

    } catch (err) {
        console.error('❌ Error during notification cleanup:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error during cleanup.',
            details: err.message
        });
    }
});

// 📊 GET NOTIFICATION STATISTICS (for admin dashboard)
router.get('/admin/stats', isAdmin, async (req, res) => {
    console.log('📊 Fetching notification statistics');

    try {
        const pool = getDbPool(req);
        const request = pool.request();

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
                u.Username,
                u.fullName,
                COUNT(*) as notificationCount
            FROM Notifications n
            INNER JOIN Users u ON n.UserID = u.UserID
            GROUP BY u.UserID, u.Username, u.fullName
            ORDER BY notificationCount DESC;
        `;

        const result = await request.query(query);

        res.json({
            success: true,
            stats: {
                overview: result.recordsets[0][0],
                byType: result.recordsets[1],
                topUsers: result.recordsets[2]
            }
        });

    } catch (err) {
        console.error('❌ Error fetching notification stats:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error fetching stats.',
            details: err.message
        });
    }
});

export default router;