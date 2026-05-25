const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    console.log("Connecting to:", process.env.POSTGRES_URL);
    const res = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';");
    console.log("Tables in database:", res.rows);
    
    for (let row of res.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM "${row.tablename}"`);
      console.log(`Table ${row.tablename} count:`, countRes.rows[0].count);
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

main();
