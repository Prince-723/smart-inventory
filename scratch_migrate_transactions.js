const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    console.log("Setting DEFAULT CURRENT_TIMESTAMP for transactions(created_at)...");
    await pool.query("ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;");
    console.log("Successfully updated transactions table!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

main();
