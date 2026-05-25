const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    console.log("Connecting to PostgreSQL to run billing migrations...");

    // 1. Create 'receipts' table
    console.log("Creating 'receipts' table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create 'receipt_items' table
    console.log("Creating 'receipt_items' table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipt_items (
        id SERIAL PRIMARY KEY,
        receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL
      );
    `);

    // 3. Add performance indexes
    console.log("Creating performance indexes...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
    `);

    console.log("✅ Billing database migrations completed successfully!");
  } catch (err) {
    console.error("❌ Billing migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
