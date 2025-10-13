// backend/server.js - FIXED VERSION with LanguageTool Warmup
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
import languageToolService from './services/languageToolService.js';

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

console.log('Connecting to SQL Server with config:');
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
        console.log('Connected to SQL Server database.');
        startNotificationCleanup(pool);
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1); 
    }
}

// Warmup LanguageTool to avoid cold start delays
async function warmupLanguageTool() {
    console.log('\n🔥 Waiting for LanguageTool to be ready...');
    
    const maxRetries = 30;
    const retryDelay = 1000; 
    let retries = 0;
    let languageToolReady = false;
    
    while (!languageToolReady && retries < maxRetries) {
        try {
            const response = await fetch('http://localhost:8081/v2/languages', {
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                languageToolReady = true;
                console.log('✅ LanguageTool is ready!\n');
            }
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                process.stdout.write(`   Attempt ${retries}/${maxRetries}...\r`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    
    if (!languageToolReady) {
        console.warn('⚠️ LanguageTool did not start within 30 seconds. Skipping warmup.');
        console.warn('   First requests will be slow due to cold start.\n');
        return;
    }
    
    console.log('=== LanguageTool Warmup Starting ===');
    
    const testTexts = [
        { text: 'Hello world', lang: 'en-US', name: 'English (US)' },
        { text: 'Bonjour le monde', lang: 'fr', name: 'French' },
        { text: 'Привет мир', lang: 'ru-RU', name: 'Russian' },
        { text: 'Hola mundo', lang: 'es', name: 'Spanish' },
        { text: 'Hallo Welt', lang: 'de', name: 'German' },
        { text: '你好世界', lang: 'zh-CN', name: 'Chinese' },
        { text: 'Ciao mondo', lang: 'it', name: 'Italian' },
        { text: 'Olá mundo', lang: 'pt', name: 'Portuguese' }
    ];
    
    const results = await Promise.allSettled(
        testTexts.map(async ({ text, lang, name }) => {
            const start = Date.now();
            try {
                await languageToolService.checkGrammar(text, lang);
                const time = Date.now() - start;
                return { name, lang, time, success: true };
            } catch (error) {
                const time = Date.now() - start;
                return { name, lang, time, success: false, error: error.message };
            }
        })
    );
    
    let successCount = 0;
    let totalTime = 0;
    
    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            const { name, lang, time, success, error } = result.value;
            totalTime += time;
            
            if (success) {
                successCount++;
                console.log(`  ✅ ${name} (${lang}): ${time}ms`);
            } else {
                console.warn(`  ❌ ${name} (${lang}): ${error}`);
            }
        } else {
            console.error(`  ❌ ${testTexts[i].name}: ${result.reason}`);
        }
    });
    
    console.log(`\n✅ Warmup complete: ${successCount}/${testTexts.length} languages ready`);
    console.log(`   Total warmup time: ${totalTime}ms`);
    console.log(`   Average per language: ${Math.round(totalTime / testTexts.length)}ms`);
    console.log('=== LanguageTool Ready ===\n');
}

connectToDatabase();
app.use(cors());
app.use(compression());

app.use(['/admin.html', '/admin-dashboard.html', '/admin*'], (req, res, next) => {
    console.log('Setting permissive CSP for admin route:', req.path);
    
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

// General helmet configuration for other routes
app.use((req, res, next) => {
    if (req.path.includes('admin')) {
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

// Static file serving with proper headers
app.use(express.static(path.join(__dirname, '../frontend/public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
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
    console.log('Frontend calling /api/admin/users endpoint');
    
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
        
        console.log('Backend response first user:', result.recordset[0]);
        console.log('UpdatedAt from DB:', result.recordset[0]?.UpdatedAt);

        res.json({
            success: true,
            users: result.recordset
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/check', (req, res) => {
    res.json({ status: 'ok', message: 'API is running.' });
});

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

// Start server and warmup LanguageTool
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`API check: http://localhost:${PORT}/api/check`);
    console.log(`DB debug: http://localhost:${PORT}/api/debug/db`);
    
    if (!process.env.COHERE_API_KEY) {
        console.warn('COHERE_API_KEY is not set. Cohere API (grammar fallback) will not work.');
    }
    
    warmupLanguageTool().catch(error => {
        console.error('LanguageTool warmup failed:', error.message);
        console.warn('Server will continue, but first requests may be slow.');
    });
});