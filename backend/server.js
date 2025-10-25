// backend/server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import sql from 'mssql';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Import routes & services
import notificationRoutes from './routes/notificationRoutes.js';
import { startNotificationCleanup } from './services/notificationCleanup.js';
import statsRoutes from './routes/statsRoutes.js';
import grammarRoutes from './routes/grammar.js';
import userRoutes from './routes/userRoutes.js';
import usageRoutes from './routes/usageRoutes.js';
import languageToolService from './services/languageToolService.js';
import rewriteRoutes from './routes/rewriteRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// === SQL CONFIGURATION ===
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

if (dbConfig.user?.trim() && dbConfig.password?.trim()) {
  dbConfig.options.trustedConnection = false;
} else {
  dbConfig.options.trustedConnection = true;
}

console.log('➡️ Connecting to SQL Server with config:');
console.log('Server:', dbConfig.server);
console.log('Database:', dbConfig.database);
if (dbConfig.user) console.log('User:', dbConfig.user);
console.log(
  'Authentication:',
  dbConfig.options.trustedConnection
    ? 'Windows Authentication'
    : 'SQL Server Authentication'
);

// === CONNECT TO DATABASE ===
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

// === LANGUAGE TOOL WARMUP ===
async function warmupLanguageTool() {
  console.log('\n🔥 Waiting for LanguageTool to be ready...');

  const maxRetries = 15;
  const retryDelay = 1000;
  let retries = 0;
  let ready = false;

  while (!ready && retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:8081/v2/languages', {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        ready = true;
        console.log('✅ LanguageTool is ready!\n');
      }
    } catch {
      retries++;
      if (retries < maxRetries) {
        process.stdout.write(`   Attempt ${retries}/${maxRetries}...\r`);
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
  }

  if (!ready) {
    console.warn('⚠️ LanguageTool did not start in time. Skipping warmup.\n');
    return;
  }

  console.log('=== LanguageTool Warmup Starting ===');
  const testTexts = [
    { text: 'Hello world', lang: 'en-US', name: 'English (US)' },
    { text: 'Bonjour le monde', lang: 'fr', name: 'French' },
    { text: 'Hallo Welt', lang: 'de-DE', name: 'German' },
    { text: 'Hola mundo', lang: 'es', name: 'Spanish' },
    { text: 'Olá mundo', lang: 'pt', name: 'Portuguese' },
    { text: 'Ciao mondo', lang: 'it', name: 'Italian' },
    { text: 'Привет мир', lang: 'ru-RU', name: 'Russian' },
    { text: 'こんにちは世界', lang: 'ja-JP', name: 'Japanese' },
    { text: '你好世界', lang: 'zh-CN', name: 'Chinese' }
  ];

  const results = await Promise.allSettled(
    testTexts.map(async ({ text, lang, name }) => {
      const start = Date.now();
      try {
        await languageToolService.checkGrammar(text, lang);
        const time = Date.now() - start;
        return { name, lang, time, success: true };
      } catch (err) {
        return { name, lang, success: false, error: err.message };
      }
    })
  );

  const successCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  console.log(`\n✅ Warmup complete: ${successCount}/${testTexts.length} ready`);
  console.log('=== LanguageTool Ready ===\n');
}

// === MIDDLEWARE ===
app.use(cors());
app.use(compression());
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Try again later.',
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === STATIC FILES ===
app.use(express.static(path.join(__dirname, '../frontend/public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (filePath.includes('admin')) res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

// === ROUTES ===
app.get('/', (req, res) => {
  console.log(`Request to ${req.path} from ${req.ip}`);
  res.sendFile(path.join(__dirname, '../frontend/public/introduction.html'));
});

app.use('/api/grammar', grammarRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/rewrite', rewriteRoutes);

// === HEALTH & DEBUG ===
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/check', (req, res) => {
  res.json({ status: 'ok', message: 'API is running.' });
});

app.get('/api/debug/db', async (req, res) => {
  try {
    if (!req.app.locals.db) throw new Error('DB not connected');
    const result = await req.app.locals.db.request().query('SELECT COUNT(*) AS users FROM Users');
    res.json({ success: true, userCount: result.recordset[0].users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === GLOBAL ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message });
});

// === START SERVER ===
(async () => {
  try {
    await connectToDatabase();
    
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Admin panel: http://localhost:${PORT}/admin.html`);
      console.log(`🔍 API check: http://localhost:${PORT}/api/check`);
      console.log(`🧠 DB debug: http://localhost:${PORT}/api/debug/db`);

      if (!process.env.COHERE_API_KEY) {
        console.warn('⚠️ COHERE_API_KEY not found. Cohere will not be used.');
      }

      await warmupLanguageTool().catch((e) =>
        console.warn('LanguageTool warmup skipped:', e.message)
      );
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();