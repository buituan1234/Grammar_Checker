// backend/server.js - FIXED VERSION
import express from 'express'; 
import cors from 'cors'; 
import rateLimit from 'express-rate-limit'; 
import helmet from 'helmet'; 
import compression from 'compression'; 
import sql from 'mssql'; 
import dotenv from 'dotenv'; 
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import notificationRoutes from './routes/notificationRoutes.js';
import { startNotificationCleanup } from './services/notificationCleanup.js';
import statsRoutes from './routes/statsRoutes.js';
import grammarRoutes from './routes/grammar.js'; 
import userRoutes from './routes/userRoutes.js'; 
import usageRoutes from './routes/usageRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') }); 

const app = express();
const PORT = process.env.PORT || 3000;

// SQL Server connection configuration
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false, 
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE 
    }
};

if (process.env.DB_USER && process.env.DB_USER.trim() !== '' && process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
    dbConfig.user = process.env.DB_USER.trim();
    dbConfig.password = process.env.DB_PASSWORD.trim();
    dbConfig.options.trustedConnection = false; 
} else {
    dbConfig.options.trustedConnection = true;
}

console.log('➡️ Connecting to SQL Server with config:');
console.log('Server:', dbConfig.server);
console.log('Database:', dbConfig.database);
if (dbConfig.user) {
    console.log('User:', dbConfig.user);
}
if (dbConfig.options.trustedConnection) {
    console.log('Authentication: Windows Authentication (Trusted Connection)');
} else if (dbConfig.user) {
    console.log('Authentication: SQL Server Authentication');
}

async function connectToDatabase() {
    try {
        const pool = new sql.ConnectionPool(dbConfig);
        await pool.connect();
        app.locals.db = pool; 
        console.log('✅ Connected to SQL Server database.');
        startNotificationCleanup(pool);
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1); 
    }
}

connectToDatabase();

// Middleware order is CRITICAL
app.use(cors());
app.use(compression());

// ✅ FIX: Admin-specific CSP configuration BEFORE general helmet
app.use(['/admin.html', '/admin-dashboard.html', '/admin*'], (req, res, next) => {
    console.log('🔓 Setting permissive CSP for admin route:', req.path);
    
    // Set very permissive CSP for admin pages only
    res.setHeader('Content-Security-Policy', 
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob: ws: wss:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob: https://cdnjs.cloudflare.com; " +
        "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob: https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https: data:; " +
        "font-src 'self' https: data:; " +
        "img-src 'self' https: data: blob:; " +
        "connect-src 'self' https: data: ws: wss:; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );
    next();
});

// ✅ FIX: General helmet configuration for other routes
app.use((req, res, next) => {
    if (req.path.includes('admin')) {
        // Skip helmet CSP for admin pages
        return next();
    }
    
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
                fontSrc: ["'self'", "https:", "data:"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    })(req, res, next);
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ FIX: Static file serving with proper headers
app.use(express.static(path.join(__dirname, '../frontend/public'), {
    setHeaders: (res, path) => {
        // Set proper MIME types for JS modules
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        // Allow CORS for admin files
        if (path.includes('admin')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/introduction.html'));
});

// Routes
app.use('/api/grammar', grammarRoutes); 

app.use('/api/users', userRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

app.use('/api/usage', usageRoutes);

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/api/admin/users', async (req, res) => {
    console.log('🎯 Frontend calling /api/admin/users endpoint');
    
    try {
        if (!req.app.locals.db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const result = await req.app.locals.db.request().query(`
            SELECT 
                UserID, Username, Email, Phone, UserRole, 
                FullName, AccountType, UserStatus, 
                FORMAT(CreatedAt, 'yyyy-MM-ddTHH:mm:ss.fffZ') as CreatedAt,
                FORMAT(UpdatedAt, 'yyyy-MM-ddTHH:mm:ss.fffZ') as UpdatedAt
            FROM Users
            ORDER BY CreatedAt DESC
        `);
        
        console.log('🔍 Backend response first user:', result.recordset[0]);
        console.log('📅 UpdatedAt from DB:', result.recordset[0]?.UpdatedAt);

        res.json({
            success: true,
            users: result.recordset
        });
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/check', (req, res) => {
    res.json({ status: 'ok', message: 'API is running.' });
});

// ✅ ADD: Debug endpoint to check database connection
app.get('/api/debug/db', async (req, res) => {
    try {
        if (!req.app.locals.db) {
            return res.status(500).json({ 
                success: false, 
                error: 'Database pool not available' 
            });
        }
        
        const result = await req.app.locals.db.request().query('SELECT COUNT(*) as userCount FROM Users');
        res.json({ 
            success: true, 
            dbConnected: true,
            userCount: result.recordset[0].userCount
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message,
            dbConnected: false 
        });
    }
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`🔍 API check: http://localhost:${PORT}/api/check`);
    console.log(`🔍 DB debug: http://localhost:${PORT}/api/debug/db`);
    
    if (!process.env.COHERE_API_KEY) {
        console.warn('⚠️ COHERE_API_KEY is not set. Cohere API (grammar fallback) will not work.');
    }
}

);