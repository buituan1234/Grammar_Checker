// backend/routes/userRoutes.js - FIXED VERSION WITH isAdmin MIDDLEWARE
import express from 'express';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import { createNotification } from './notificationRoutes.js';

const router = express.Router();

function getDbPool(req) {
    if (!req.app.locals.db) {
        console.error('❌ Database pool not available in req.app.locals.db');
        throw new Error('Database pool not available.');
    }
    console.log('✅ Database pool retrieved successfully');
    return req.app.locals.db;
}

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

// --- Update user by ID (for admin.js fallback compatibility)
router.put('/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, email, phone, fullName, role, accountType, status } = req.body;

    if (!username || !email || !fullName) {
        return res.status(400).json({
            success: false,
            error: 'Username, email, and full name are required.'
        });
    }

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        const query = `
            UPDATE Users
            SET 
                Username = @username,
                Email = @email,
                Phone = @phone,
                fullName = @fullName,
                UserRole = @role,
                AccountType = @accountType,
                UserStatus = @status
            WHERE UserID = @updateUserId;
        `;

        request.input('username', sql.NVarChar(50), username);
        request.input('email', sql.NVarChar(100), email);
        request.input('phone', sql.NVarChar(20), phone || null);
        request.input('fullName', sql.NVarChar(100), fullName);
        request.input('role', sql.NVarChar(50), role || 'user');
        request.input('accountType', sql.NVarChar(50), accountType || 'free');
        request.input('status', sql.NVarChar(50), status || 'active');
        request.input('updateUserId', sql.Int, userId);

        const result = await request.query(query);

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'User updated successfully.' });
        } else {
            res.status(404).json({ success: false, error: 'User not found or no changes made.' });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Internal server error updating user.',
            details: err.message
        });
    }
});

// --- Register (for regular users, no admin required)
router.post('/register', async (req, res) => {
    const { username, password, email, phone, fullName } = req.body;
    
    console.log('📝 User registration attempt - FULL REQUEST BODY:', req.body);
    console.log('📝 Extracted fields:', {
        username,
        password: password ? '***' : 'MISSING',
        email,
        phone: phone || 'Not provided',
        fullName: fullName || 'MISSING'
    });

    if (!username || !password || !email || !fullName) {
        console.log('❌ Registration failed: Missing required fields');
        console.log('❌ Missing fields check:', {
            username: !username ? 'MISSING' : 'OK',
            password: !password ? 'MISSING' : 'OK', 
            email: !email ? 'MISSING' : 'OK',
            fullName: !fullName ? 'MISSING' : 'OK'
        });
        return res.status(400).json({ 
            success: false, 
            error: 'Username, password, email, and full name are required.',
            received: Object.keys(req.body)
        });
    }

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        request.input('username', sql.NVarChar(50), username);
        request.input('email', sql.NVarChar(100), email);

        console.log('🔍 Checking for existing username/email...');
        const checkResult = await request.query`
            SELECT COUNT(*) AS count FROM Users WHERE Username = @username OR Email = @email;
        `;

        if (checkResult.recordset[0].count > 0) {
            console.log('❌ Registration failed: Username or email already exists');
            return res.status(409).json({ 
                success: false, 
                error: 'Username or email already exists.' 
            });
        }

        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO Users (Username, PasswordHash, Email, Phone, UserRole, fullName, CreatedAt, UserStatus, AccountType)
            VALUES (@username, @hashedPassword, @email, @phone, 'user', @fullName, GETDATE(), 'active', 'free');
        `;

        request.input('hashedPassword', sql.NVarChar(255), hashedPassword);
        request.input('phone', sql.NVarChar(20), phone || null);
        request.input('fullName', sql.NVarChar(100), fullName);

        console.log('💾 Inserting new user into database...');
        await request.query(query);

        console.log('✅ User registered successfully:', username);
        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully.' 
        });

    } catch (err) {
        console.error('❌ Error registering user:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error during registration.',
            details: err.message
        });
    }
});

// --- Login ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('🔑 Login attempt for username:', username);

    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username and password are required.' 
        });
    }

    try {
        const pool = getDbPool(req);
        const request = pool.request();
        request.input('username', sql.NVarChar(50), username);

        const result = await request.query`
            SELECT UserID, Username, PasswordHash, Email, Phone, UserRole, fullName
            FROM Users WHERE Username = @username;
        `;

        if (result.recordset.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password.' 
            });
        }

        const user = result.recordset[0];
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);

        if (isPasswordValid) {
            res.json({
                success: true,
                message: 'Login successful.',
                userId: user.UserID,      
                username: user.Username, 
                email: user.Email,        
                phone: user.Phone,        
                userRole: user.UserRole,
                fullName: user.fullName
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password.' 
            });
        }

    } catch (err) {
        console.error('❌ Error during login:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error during login.',
            details: err.message
        });
    }
});

// --- Admin: Update user ---
router.put('/admin/update/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    const { username, email, phone, fullName, role, accountType, status } = req.body;

    console.log('🔄 Admin updating user:', { userId, username, accountType, status, role });

    if (!username || !email || !fullName) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username, email, and full name are required.' 
        });
    }

    try {
        const pool = getDbPool(req);
        
        // FIRST: Get current user data for comparison
        const getCurrentUserRequest = pool.request();
        getCurrentUserRequest.input('userId', sql.Int, userId);
        
        const currentUserQuery = `
            SELECT Username, Email, Phone, fullName, UserRole, AccountType, UserStatus 
            FROM Users WHERE UserID = @userId;
        `;
        
        const currentUserResult = await getCurrentUserRequest.query(currentUserQuery);
        
        if (currentUserResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        
        const currentUser = currentUserResult.recordset[0];
        console.log('📋 Current user data:', currentUser);

        // UPDATE user data
        const updateRequest = pool.request();
        const query = `
            UPDATE Users
            SET Username = @username, 
                Email = @email, 
                Phone = @phone, 
                fullName = @fullName,
                UserRole = @role,
                AccountType = @accountType,
                UserStatus = @status,
                UpdatedAt = GETDATE()
            WHERE UserID = @updateUserId;
        `;

        updateRequest.input('username', sql.NVarChar(50), username);
        updateRequest.input('email', sql.NVarChar(100), email);
        updateRequest.input('phone', sql.NVarChar(20), phone || null);
        updateRequest.input('fullName', sql.NVarChar(100), fullName);
        updateRequest.input('role', sql.NVarChar(50), role || 'user');
        updateRequest.input('accountType', sql.NVarChar(50), accountType || 'free');
        updateRequest.input('status', sql.NVarChar(50), status || 'active');
        updateRequest.input('updateUserId', sql.Int, userId);

        console.log('💾 Executing SQL update with params:', { 
            username, email, fullName, role, accountType, status 
        });

        const result = await updateRequest.query(query);

        if (result.rowsAffected[0] > 0) {
            // THÊM: Query lại user vừa update để trả về data mới với format đúng
            const updatedUserQuery = pool.request();
            updatedUserQuery.input('userId', sql.Int, userId);
                         
            const updatedUserResult = await updatedUserQuery.query(`
                SELECT
                    UserID, Username, Email, Phone, UserRole,
                    FullName, AccountType, UserStatus,
                    FORMAT(CreatedAt, 'yyyy-MM-ddTHH:mm:ss.fffZ') as CreatedAt,
                    FORMAT(UpdatedAt, 'yyyy-MM-ddTHH:mm:ss.fffZ') as UpdatedAt
                FROM Users WHERE UserID = @userId
            `);

            console.log('✅ User updated successfully in database:', userId);
            console.log('📅 Updated user data:', updatedUserResult.recordset[0]);

            // 🔔 CREATE NOTIFICATION for the updated user
            try {
                // Get admin ID from headers (you'll need to pass this from frontend)
                const adminId = req.headers['x-admin-id'] || req.headers['x-user-id'];
                
                // Determine what changed
                const changes = [];
                if (currentUser.Username !== username) changes.push(`Username: ${currentUser.Username} → ${username}`);
                if (currentUser.Email !== email) changes.push(`Email: ${currentUser.Email} → ${email}`);
                if (currentUser.fullName !== fullName) changes.push(`Name: ${currentUser.fullName} → ${fullName}`);
                if (currentUser.UserRole !== (role || 'user')) changes.push(`Role: ${currentUser.UserRole} → ${role || 'user'}`);
                if (currentUser.AccountType !== (accountType || 'free')) changes.push(`Account: ${currentUser.AccountType} → ${accountType || 'free'}`);
                if (currentUser.UserStatus !== (status || 'active')) changes.push(`Status: ${currentUser.UserStatus} → ${status || 'active'}`);

                if (changes.length > 0) {
                    const notificationData = {
                        userID: parseInt(userId),
                        title: 'Account Updated by Administrator',
                        message: `Your account information has been updated. Changes: ${changes.join(', ')}`,
                        type: 'profile_update',
                        adminAction: 'update_user_profile',
                        adminID: adminId ? parseInt(adminId) : null,
                        metadata: {
                            changes: changes,
                            updatedFields: Object.keys(req.body),
                            timestamp: new Date().toISOString(),
                            previousValues: {
                                username: currentUser.Username,
                                email: currentUser.Email,
                                fullName: currentUser.fullName,
                                role: currentUser.UserRole,
                                accountType: currentUser.AccountType,
                                status: currentUser.UserStatus
                            }
                        }
                    };

                    console.log('Creating notification for user:', userId);
                    await createNotification(pool, notificationData);
                    console.log('Notification created successfully');
                } else {
                    console.log('No changes detected, skipping notification');
                }
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
            }

            res.json({
                success: true,
                message: 'User updated successfully.',
                user: updatedUserResult.recordset[0] 
            });
        } else {
            res.status(404).json({ success: false, error: 'User not found or no changes made.' });
        }
    } catch (err) {
        console.error('❌ Error updating user:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error updating user.',
            details: err.message
        });
    }
});

// --- ✅ FIXED: Admin: Create user (for admin panel) - NOW WITH isAdmin MIDDLEWARE
router.post('/', isAdmin, async (req, res) => {
    const { username, password, email, phone, fullName, role, accountType, status } = req.body;

    console.log('👤 Admin creating new user:', {
        username,
        email,
        phone: phone || 'Not provided',
        role: role || 'user (default)',
        accountType: accountType || 'free (default)',
        status: status || 'active (default)',
        fullName
    });

    if (!username || !password || !email || !fullName) {
        console.log('❌ Admin create user failed: Missing required fields');
        return res.status(400).json({
            success: false,
            error: 'Username, password, email, and full name are required.'
        });
    }

    try {
        const pool = getDbPool(req);
        const request = pool.request();

        // Check for existing username/email
        request.input('username', sql.NVarChar(50), username);
        request.input('email', sql.NVarChar(100), email);

        console.log('🔍 Checking for existing username/email...');
        const checkResult = await request.query`
            SELECT COUNT(*) AS count FROM Users WHERE Username = @username OR Email = @email;
        `;

        if (checkResult.recordset[0].count > 0) {
            console.log('❌ Admin create user failed: Username or email already exists');
            return res.status(409).json({
                success: false,
                error: 'Username or email already exists.'
            });
        }

        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user and get the new ID
        const insertQuery = `
            INSERT INTO Users (Username, PasswordHash, Email, Phone, UserRole, fullName, CreatedAt, UserStatus, AccountType)
            VALUES (@username, @hashedPassword, @email, @phone, @role, @fullName, GETDATE(), @status, @accountType);
            SELECT SCOPE_IDENTITY() as NewUserID;
        `;

        request.input('hashedPassword', sql.NVarChar(255), hashedPassword);
        request.input('phone', sql.NVarChar(20), phone || null);
        request.input('role', sql.NVarChar(50), role || 'user');
        request.input('fullName', sql.NVarChar(100), fullName);
        request.input('status', sql.NVarChar(50), status || 'active');
        request.input('accountType', sql.NVarChar(50), accountType || 'free');

        console.log('💾 Inserting new user into database...');
        const insertResult = await request.query(insertQuery);
        const newUserId = insertResult.recordset[0].NewUserID;

        // 🔔 CREATE WELCOME NOTIFICATION
        try {
            const adminId = req.headers['x-admin-id'] || req.headers['x-user-id'];
            
            const notificationData = {
                userID: newUserId,
                title: 'Welcome to Grammar Checker!',
                message: `Welcome ${fullName}! Your account has been created by an administrator with ${accountType} access. You can now start using our grammar checking service.`,
                type: 'welcome',
                adminAction: 'create_user_account',
                adminID: adminId ? parseInt(adminId) : null,
                metadata: {
                    accountType: accountType || 'free',
                    userRole: role || 'user',
                    createdBy: 'admin',
                    timestamp: new Date().toISOString()
                }
            };

            console.log('🔔 Creating welcome notification for new user:', newUserId);
            await createNotification(pool, notificationData);
            console.log('✅ Welcome notification created successfully');
        } catch (notificationError) {
            console.error('❌ Error creating welcome notification:', notificationError);
            // Don't fail user creation if notification creation fails
        }

        console.log('✅ Admin created user successfully:', username);
        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            userId: newUserId
        });
    } catch (err) {
        console.error('❌ Error creating user:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error creating user.',
            details: err.message
        });
    }
});

// --- Admin: Delete user ---
router.delete('/admin/delete/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;

    try {
        const pool = getDbPool(req);
        const request = pool.request();
        request.input('userId', sql.Int, userId);

        const result = await request.query`
            DELETE FROM Users WHERE UserID = @userId;
        `;

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'User deleted successfully.' });
        } else {
            res.status(404).json({ success: false, error: 'User not found.' });
        }

    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error deleting user.',
            details: err.message
        });
    }
});

export default router;