const isRailway = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_STATIC_URL
);

// Only load .env when running locally and DATABASE_URL is not provided
if (!isRailway && !process.env.DATABASE_URL) {
  require('dotenv').config({ override: false });
}
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const runMigrations = require('./runMigrations');

function describeDbUrl(value) {
  if (!value) return 'missing';
  try {
    const u = new URL(value);
    const db = u.pathname ? u.pathname.replace('/', '') : '';
    return `${u.hostname}:${u.port || ''}/${db}`;
  } catch (err) {
    return 'invalid-url';
  }
}

console.log('[Server] DATABASE_URL available:', !!process.env.DATABASE_URL);
console.log('[Server] DATABASE_URL host:', describeDbUrl(process.env.DATABASE_URL));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRailway ? { rejectUnauthorized: false } : undefined
});

const app = express();
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

// CORS Configuration
const allowedOrigins = [
  'https://resi-validator.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-checker-username']
};

// Force CORS headers at the edge of our app to avoid proxy/platform headers
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // server-to-server or same-origin
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // default to explicit allowed Vercel origin to avoid mismatched host header
    res.setHeader('Access-Control-Allow-Origin', 'https://resi-validator.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key, x-checker-username');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

const requireAdmin = (req, res, next) => {
  const key = req.get('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  next();
});

// Healthcheck route to verify the server is running (DB not required)
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: Date.now(), env: process.env.NODE_ENV || 'development' });
});

// GET semua items - untuk autocomplete di form
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM item ORDER BY item_code ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch items' });
  }
});

// GET item by item_code - untuk auto-fill nama item
app.get('/api/items/:itemCode', async (req, res) => {
  try {
    const { itemCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM item WHERE item_code = $1',
      [itemCode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch item' });
  }
});

// Admin CRUD: items
app.get('/api/admin/items', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM item ORDER BY item_code ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch items admin' });
  }
});

app.post('/api/admin/items', requireAdmin, async (req, res) => {
  const { item_code, item_name, compatible_phone } = req.body;
  if (!item_code || !item_name) {
    return res.status(400).json({ error: 'item_code dan item_name diperlukan' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO item (item_code, item_name, compatible_phone) VALUES ($1, $2, $3) RETURNING *',
      [item_code, item_name, compatible_phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Item code sudah ada' });
    }
    res.status(500).json({ error: 'gagal menambahkan item' });
  }
});

app.put('/api/admin/items/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { item_code, item_name, compatible_phone } = req.body;
  if (!item_code && !item_name && compatible_phone === undefined) {
    return res.status(400).json({ error: 'Tidak ada data yang diubah' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM item WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item tidak ditemukan' });
    }

    const current = existing.rows[0];
    const nextCode = item_code || current.item_code;
    const nextName = item_name || current.item_name;
    const nextPhone = compatible_phone !== undefined ? compatible_phone : current.compatible_phone;

    if (item_code && item_code !== current.item_code) {
      const used = await client.query(
        'SELECT COUNT(*)::int AS cnt FROM resi_items WHERE item_code = $1',
        [current.item_code]
      );
      if (used.rows[0].cnt > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Item code tidak bisa diubah karena sudah dipakai di resi' });
      }
    }

    const result = await client.query(
      'UPDATE item SET item_code = $1, item_name = $2, compatible_phone = $3 WHERE id = $4 RETURNING *',
      [nextCode, nextName, nextPhone, id]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Item code sudah ada' });
    }
    res.status(500).json({ error: 'gagal mengubah item' });
  } finally {
    client.release();
  }
});

app.delete('/api/admin/items/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT item_code FROM item WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item tidak ditemukan' });
    }
    const itemCode = existing.rows[0].item_code;
    const used = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM resi_items WHERE item_code = $1',
      [itemCode]
    );
    if (used.rows[0].cnt > 0) {
      return res.status(409).json({ error: 'Item tidak bisa dihapus karena sudah dipakai di resi' });
    }
    await pool.query('DELETE FROM item WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal menghapus item' });
  }
});

// POST resi - simpan dokumen pengiriman beserta multiple items
app.post('/api/resi', async (req, res) => {
  const { resiNumber, details } = req.body;
  if (!resiNumber || !Array.isArray(details) || details.length === 0) {
    return res.status(400).json({ error: 'resiNumber dan details diperlukan' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert resi header
    const resiResult = await client.query(
      'INSERT INTO resi (resi_number, total_items) VALUES ($1, $2) RETURNING *',
      [resiNumber, details.length]
    );
    const resiId = resiResult.rows[0].id;

    // 2. Insert resi items
    const inserted = [];
    const itemText = `INSERT INTO resi_items (resi_id, item_code, item_name, quantity_item)
                      VALUES ($1, $2, $3, $4) RETURNING *`;

    for (const d of details) {
      const values = [
        resiId,
        d.id || null,
        d.nama || null,
        d.kuantitas ? Number(d.kuantitas) : 1,
      ];
      const r = await client.query(itemText, values);
      inserted.push(r.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ resi: resiResult.rows[0], items: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    
    // Handle duplicate resi_number error
    if (err.code === '23505' && err.constraint === 'resi_resi_number_key') {
      return res.status(409).json({ error: `Nomor resi "${resiNumber}" sudah ada di database. Gunakan nomor resi yang berbeda.` });
    }
    
    res.status(500).json({ error: 'gagal menyimpan resi ke database' });
  } finally {
    client.release();
  }
});

// GET pending resi (those with any unverified items)
app.get('/api/resi/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id as resi_id, r.resi_number, r.total_items, r.created_at,
              ri.id as resi_item_id, ri.item_code, ri.item_name, ri.quantity_item, ri.verified
       FROM resi r
       JOIN resi_items ri ON ri.resi_id = r.id
       WHERE ri.verified = false
       ORDER BY r.created_at DESC`
    );
    // Transform rows into grouped structure by resi
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.resi_id]) {
        grouped[row.resi_id] = {
          resi_id: row.resi_id,
          resi_number: row.resi_number,
          total_items: row.total_items,
          created_at: row.created_at,
          items: [],
        };
      }
      grouped[row.resi_id].items.push({
        resi_item_id: row.resi_item_id,
        item_code: row.item_code,
        item_name: row.item_name,
        quantity_item: row.quantity_item,
        verified: row.verified,
      });
    }
    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch pending resi' });
  }
});

// Daily stats for dashboard (today)
app.get('/api/stats/daily', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH per_resi AS (
         SELECT r.id, r.created_at::date AS day,
                COALESCE(bool_and(ri.verified), false) AS all_verified
         FROM resi r
         LEFT JOIN resi_items ri ON ri.resi_id = r.id
         WHERE r.created_at::date = CURRENT_DATE
         GROUP BY r.id, r.created_at::date
       )
       SELECT CURRENT_DATE AS day,
              COUNT(*)::int AS total_resi,
              COALESCE(SUM(CASE WHEN all_verified THEN 1 ELSE 0 END), 0)::int AS verified_resi,
              COALESCE(SUM(CASE WHEN NOT all_verified THEN 1 ELSE 0 END), 0)::int AS pending_resi
       FROM per_resi`
    );

    const row = result.rows[0] || { day: null, total_resi: 0, verified_resi: 0, pending_resi: 0 };
    const total = row.total_resi || 0;
    const verified = row.verified_resi || 0;
    const pending = row.pending_resi || 0;
    const percent = total > 0 ? Math.round((verified / total) * 100) : 0;

    res.json({
      day: row.day,
      total_resi: total,
      verified_resi: verified,
      pending_resi: pending,
      verified_percent: percent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch daily stats' });
  }
});

// Daily report (admin/owner)
app.get('/api/admin/reports/daily', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const result = await pool.query(
      `WITH per_resi AS (
         SELECT r.id, r.created_at::date AS day,
                COALESCE(bool_and(ri.verified), false) AS all_verified
         FROM resi r
         LEFT JOIN resi_items ri ON ri.resi_id = r.id
         GROUP BY r.id, r.created_at::date
       ), daily AS (
         SELECT day,
                COUNT(*)::int AS total_resi,
                COALESCE(SUM(CASE WHEN all_verified THEN 1 ELSE 0 END), 0)::int AS verified_resi
         FROM per_resi
         GROUP BY day
       )
       SELECT day,
              total_resi,
              verified_resi,
              (total_resi - verified_resi)::int AS pending_resi
       FROM daily
       ORDER BY day DESC
       LIMIT $1`,
      [days]
    );

    const payload = result.rows.map((row) => {
      const total = row.total_resi || 0;
      const verified = row.verified_resi || 0;
      const pending = row.pending_resi || 0;
      const percent = total > 0 ? Math.round((verified / total) * 100) : 0;
      return {
        day: row.day,
        total_resi: total,
        verified_resi: verified,
        pending_resi: pending,
        verified_percent: percent,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch daily report' });
  }
});

// GET single resi with items
app.get('/api/resi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('SELECT * FROM resi WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Resi tidak ditemukan' });
    
    // Get items with checker full_name joined from users table
    const items = await pool.query(`
      SELECT 
        ri.*,
        u.full_name as verified_by_name
      FROM resi_items ri
      LEFT JOIN users u ON ri.verified_by = u.username
      WHERE ri.resi_id = $1
      ORDER BY ri.id
    `, [id]);
    
    res.json({ resi: r.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch resi' });
  }
});

const hasVerifiedItems = async (resiId) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS verified_count FROM resi_items WHERE resi_id = $1 AND verified = true',
    [resiId]
  );
  return result.rows[0].verified_count > 0;
};

// Admin CRUD: resi (only if not verified)
app.get('/api/admin/resi', requireAdmin, async (req, res) => {
  try {
    const resiResult = await pool.query(
      `SELECT r.id, r.resi_number, r.total_items, r.created_at,
              COUNT(ri.id)::int AS item_count,
              COALESCE(SUM(CASE WHEN ri.verified THEN 1 ELSE 0 END), 0)::int AS verified_count
       FROM resi r
       LEFT JOIN resi_items ri ON ri.resi_id = r.id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    );

    const itemResult = await pool.query(
      `SELECT ri.*, u.full_name as verified_by_name
       FROM resi_items ri
       LEFT JOIN users u ON ri.verified_by = u.username
       ORDER BY ri.resi_id ASC, ri.id ASC`
    );
    const byResi = {};
    for (const row of itemResult.rows) {
      if (!byResi[row.resi_id]) byResi[row.resi_id] = [];
      byResi[row.resi_id].push(row);
    }

    const payload = resiResult.rows.map((r) => ({
      ...r,
      items: byResi[r.id] || [],
    }));
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch resi admin' });
  }
});

app.put('/api/admin/resi/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { resiNumber, items } = req.body;

  if (!resiNumber || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'resiNumber dan items diperlukan' });
  }

  try {
    const blocked = await hasVerifiedItems(id);
    if (blocked) {
      return res.status(409).json({ error: 'Resi tidak bisa diubah karena sudah terverifikasi' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'gagal memeriksa status resi' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const codes = items.map((i) => i.item_code).filter(Boolean);
    const itemLookup = await client.query(
      'SELECT item_code, item_name FROM item WHERE item_code = ANY($1::text[])',
      [codes]
    );
    const itemMap = new Map(itemLookup.rows.map((row) => [row.item_code, row.item_name]));

    for (const code of codes) {
      if (!itemMap.has(code)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Item code tidak ditemukan: ${code}` });
      }
    }

    const resiUpdate = await client.query(
      'UPDATE resi SET resi_number = $1, total_items = $2 WHERE id = $3 RETURNING *',
      [resiNumber, items.length, id]
    );
    if (resiUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Resi tidak ditemukan' });
    }

    await client.query('DELETE FROM resi_items WHERE resi_id = $1', [id]);

    const insertText = `INSERT INTO resi_items (resi_id, item_code, item_name, quantity_item)
                        VALUES ($1, $2, $3, $4) RETURNING *`;
    const inserted = [];
    for (const item of items) {
      const quantity = item.quantity_item ? Number(item.quantity_item) : 1;
      const name = itemMap.get(item.item_code);
      const r = await client.query(insertText, [id, item.item_code, name, quantity]);
      inserted.push(r.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ resi: resiUpdate.rows[0], items: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505' && err.constraint === 'resi_resi_number_key') {
      return res.status(409).json({ error: `Nomor resi "${resiNumber}" sudah ada di database.` });
    }
    res.status(500).json({ error: 'gagal mengubah resi' });
  } finally {
    client.release();
  }
});

app.delete('/api/admin/resi/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const blocked = await hasVerifiedItems(id);
    if (blocked) {
      return res.status(409).json({ error: 'Resi tidak bisa dihapus karena sudah terverifikasi' });
    }
    const result = await pool.query('DELETE FROM resi WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resi tidak ditemukan' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal menghapus resi' });
  }
});

// Verify a resi_item by its id with scanned code
app.post('/api/resi_items/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { scanned_code, checker } = req.body; // checker optional (username)
  if (!scanned_code) return res.status(400).json({ error: 'scanned_code diperlukan' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query('SELECT * FROM resi_items WHERE id = $1', [id]);
    if (q.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'resi_item tidak ditemukan' });
    }
    const item = q.rows[0];
    const expected = item.item_code;
    let verified = false;
    if (expected && expected.toUpperCase() === scanned_code.toUpperCase()) {
      verified = true;
      await client.query(
        'UPDATE resi_items SET verified = true, verified_at = now(), verified_by = $1 WHERE id = $2',
        [checker || null, id]
      );
    } else {
      // mark as not verified attempt (optional: increment attempts)
      await client.query(
        'UPDATE resi_items SET last_scan = now(), last_scanned_code = $1 WHERE id = $2',
        [scanned_code, id]
      );
    }

    await client.query('COMMIT');
    res.json({ resi_item_id: id, expected, scanned_code, verified });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'gagal verifikasi item' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT || 4000;

// ============================================
// USER MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ============================================

// GET all checker users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, phone_number, role, is_blocked, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
      ['checker']
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch users' });
  }
});

// POST create new checker user
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { full_name, username, phone_number } = req.body;
  
  if (!full_name || !username) {
    return res.status(400).json({ error: 'Nama lengkap dan username diperlukan' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password, full_name, phone_number, role, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, full_name, phone_number, role, is_blocked, created_at',
      [username.trim(), '123', full_name.trim(), phone_number?.trim() || null, 'checker', 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505' && err.constraint === 'users_username_key') {
      return res.status(409).json({ error: 'Username sudah terdaftar' });
    }
    res.status(500).json({ error: 'gagal membuat user' });
  }
});

// PUT block/unblock checker user
app.put('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_blocked } = req.body;

  if (typeof is_blocked !== 'boolean') {
    return res.status(400).json({ error: 'is_blocked harus boolean' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET is_blocked = $1, updated_at = now() WHERE id = $2 AND role = $3 RETURNING id, username, full_name, phone_number, role, is_blocked, created_at',
      [is_blocked, id, 'checker']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal update user status' });
  }
});

// DELETE checker user
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
      [id, 'checker']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal delete user' });
  }
});

// GET checker verification history
app.get('/api/checker/history', async (req, res) => {
  try {
    const checkerUsername = req.get('x-checker-username');
    if (!checkerUsername) {
      return res.status(400).json({ error: 'x-checker-username header diperlukan' });
    }

    // Get all resi_items verified by this checker with resi info
    const result = await pool.query(
      `SELECT 
         ri.id as resi_item_id,
         ri.resi_id,
         r.resi_number,
         ri.item_code,
         ri.item_name,
         ri.quantity_item,
         ri.verified,
         ri.verified_at,
         ri.verified_by
       FROM resi_items ri
       JOIN resi r ON ri.resi_id = r.id
       WHERE ri.verified_by = $1
       ORDER BY ri.verified_at DESC`,
      [checkerUsername]
    );

    // Group by resi
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.resi_id]) {
        grouped[row.resi_id] = {
          resi_id: row.resi_id,
          resi_number: row.resi_number,
          verified_at: row.verified_at,
          items: [],
        };
      }
      grouped[row.resi_id].items.push({
        resi_item_id: row.resi_item_id,
        item_code: row.item_code,
        item_name: row.item_name,
        quantity_item: row.quantity_item,
        verified_at: row.verified_at,
      });
    }

    const payload = Object.values(grouped);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch verification history' });
  }
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// POST login - both checker and admin
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password diperlukan' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, is_blocked FROM users WHERE username = $1 AND password = $2',
      [username.trim(), password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = result.rows[0];
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Akun Anda telah diblokir' });
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal login' });
  }
});

// PUT change password - for logged-in users
app.put('/api/auth/change-password', async (req, res) => {
  const { username, old_password, new_password } = req.body;

  if (!username || !old_password || !new_password) {
    return res.status(400).json({ error: 'Username, password lama, dan password baru diperlukan' });
  }

  if (new_password.length < 3) {
    return res.status(400).json({ error: 'Password minimal 3 karakter' });
  }

  try {
    const user = await pool.query('SELECT id FROM users WHERE username = $1 AND password = $2', [username.trim(), old_password]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Password lama salah' });
    }

    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = now() WHERE username = $2 RETURNING id, username, full_name, role',
      [new_password, username.trim()]
    );
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal update password' });
  }
});

// Add 404 handler at the end
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Run migrations before starting server
console.log('[Server] PORT from env:', process.env.PORT);
console.log('[Server] Final port to listen:', port);
runMigrations()
  .then(() => {
    console.log('[Server] Migrations completed, starting express server...');
    const server = app.listen(port, () => {
      console.log(`[Server] ✅ Server is running on http://localhost:${port}`);
    });
    
    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] ❌ Port ${port} is already in use!`);
      } else {
        console.error('[Server] ❌ Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('[Server] ❌ Migration failed, exiting:', err.message);
    process.exit(1);
  });
