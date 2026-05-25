const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    const tables = ['products', 'transactions', 'forecasts', 'alerts'];
    for (let table of tables) {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      console.log(`\nColumns for table "${table}":`);
      res.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
