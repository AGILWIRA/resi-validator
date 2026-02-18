const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    // Run top-level create_table.sql if present
    const topSql = path.join(__dirname, 'create_table.sql');
    if (fs.existsSync(topSql)) {
      const sql = fs.readFileSync(topSql, 'utf8');
      if (sql.trim()) {
        console.log('Executing create_table.sql');
        await client.query(sql);
      }
    }

    // Run any files in migrations/ in alphabetical order
    const migDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migDir)) {
      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        const fp = path.join(migDir, f);
        console.log('Executing', f);
        const s = fs.readFileSync(fp, 'utf8');
        if (s.trim()) await client.query(s);
      }
    }

    console.log('Migrations finished');
  } catch (err) {
    console.error('Migration error', err);
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
