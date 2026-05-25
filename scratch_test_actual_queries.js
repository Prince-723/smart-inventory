const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

const db = {
  query: (text, params) => pool.query(text, params),
};

async function testAlerts() {
  try {
    const alertsRes = await db.query(`
        SELECT type, message, severity, created_at
        FROM alerts 
        WHERE product_id = 1 
        ORDER BY created_at DESC
        LIMIT 3
    `);
    console.log("Alerts query worked!", alertsRes.rows);
  } catch (err) {
    console.error("Alerts query failed:", err.message);
  }
}

async function testTransactions() {
  try {
    const transactionsRes = await db.query(`
        SELECT type, quantity, description, created_at as timestamp 
        FROM transactions 
        WHERE product_id = 1 
        ORDER BY created_at DESC 
        LIMIT 5
    `);
    console.log("Transactions query worked!", transactionsRes.rows.length);
  } catch (err) {
    console.error("Transactions query failed:", err.message);
  }
}

async function main() {
  await testTransactions();
  await testAlerts();
  await pool.end();
}

main();
