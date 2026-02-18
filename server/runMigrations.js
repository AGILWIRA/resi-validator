const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  console.log('[Migration] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  if (!process.env.DATABASE_URL) {
    console.error('[Migration] ERROR: DATABASE_URL not set!');
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('[Migration] Running migrations...');

    // Run top-level create_table.sql if present
    const topSql = path.join(__dirname, 'create_table.sql');
    if (fs.existsSync(topSql)) {
      const sql = fs.readFileSync(topSql, 'utf8');
      if (sql.trim()) {
        console.log('[Migration] Executing create_table.sql');
        await client.query(sql);
        console.log('[Migration] create_table.sql completed');
      }
    } else {
      console.log('[Migration] create_table.sql not found');
    }

    // Run any files in migrations/ in alphabetical order
    const migDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migDir)) {
      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
      console.log('[Migration] Found migration files:', files);
      for (const f of files) {
        const fp = path.join(migDir, f);
        console.log('[Migration] Executing', f);
        const s = fs.readFileSync(fp, 'utf8');
        if (s.trim()) await client.query(s);
        console.log('[Migration]', f, 'completed');
      }
    } else {
      console.log('[Migration] migrations/ directory not found');
    }

    console.log('[Migration] Migrations finished successfully');
  } catch (err) {
    console.error('[Migration] ERROR:', err.message);
    console.error('[Migration] Full error:', err);
    process.exitCode = 1;
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = run;
