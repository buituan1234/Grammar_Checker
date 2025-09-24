// backend/routes/usageRoutes.js
import express from 'express';
import sql from 'mssql';

const router = express.Router();

// POST /api/usage/log - Log user activity
router.post('/log', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    if (!pool) {
      console.error('Usage log: DB pool not available', { headers: req.headers, body: req.body });
      return res.status(503).json({ success: false, error: 'Database not available' });
    }

    console.log('Usage log request body:', req.body);
    console.log('Usage log request headers:', {
      'x-user-id': req.headers['x-user-id'],
      'x-user-role': req.headers['x-user-role'],
      ua: req.headers['user-agent'],
    });

    const rawUserId = req.body?.user_id ?? req.body?.UserID ?? req.body?.user?.id ?? req.headers['x-user-id'] ?? null;
    const UserID = rawUserId ? parseInt(rawUserId, 10) : null;

    const action = (req.body?.action ?? '').toString().trim();
    if (!action) {
      return res.status(400).json({ success: false, error: 'Missing action in request body' });
    }

    const language = req.body?.language ?? req.body?.lang ?? null;
    const detailsObj = req.body?.metadata ?? req.body?.details ?? req.body?.message ?? {};
    const Details = (typeof detailsObj === 'string') ? detailsObj : JSON.stringify(detailsObj);

    // IP detection with x-forwarded-for fallback
    const ipHeader = req.headers['x-forwarded-for'] || '';
    const ipFromHeader = ipHeader.split(',').map(s => s.trim()).find(Boolean) || null;
    const IPAddress = (ipFromHeader || req.ip || req.socket?.remoteAddress || '').toString();

    const UserAgent = (req.headers['user-agent'] || req.body?.user_agent || '').toString();

    await pool.request()
      .input('UserID', sql.Int, UserID)
      .input('Action', sql.VarChar(255), action)
      .input('Language', sql.VarChar(50), language)
      .input('Details', sql.NVarChar(sql.MAX), Details)
      .input('IPAddress', sql.VarChar(100), IPAddress)
      .input('UserAgent', sql.NVarChar(sql.MAX), UserAgent)
      .query(`
        INSERT INTO UsageLogs 
          (UserID, Action, Language, Details, IPAddress, UserAgent, CreatedAt)
        VALUES 
          (@UserID, @Action, @Language, @Details, @IPAddress, @UserAgent, GETDATE())
      `);

    return res.json({ success: true });
  } catch (error) {
    console.error('Error logging usage:', error.stack || error);
    return res.status(500).json({ success: false, error: 'Failed to log usage', detail: error?.message });
  }
});

export default router;
