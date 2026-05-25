const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    console.log("Altering table alerts to add created_at column...");
    await pool.query("ALTER TABLE alerts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
    console.log("Migration successful!");
    
    // Verify columns again
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'alerts';
    `);
    console.log("Updated alerts columns:");
    res.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

main();
