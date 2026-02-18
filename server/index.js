require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();

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
  allowedHeaders: ['Content-Type', 'Authorization']
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

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

// GET single resi with items
app.get('/api/resi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('SELECT * FROM resi WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Resi tidak ditemukan' });
    const items = await pool.query('SELECT * FROM resi_items WHERE resi_id = $1', [id]);
    res.json({ resi: r.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'gagal fetch resi' });
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
app.listen(port, () => console.log(`Server listening on ${port}`));
