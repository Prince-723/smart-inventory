const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    console.log("Connecting to PostgreSQL...");
    
    // 1. Add user_id to alerts table if not present
    console.log("Checking if 'user_id' exists in 'alerts' table...");
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alerts' AND column_name = 'user_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log("Adding 'user_id' column to 'alerts' table...");
      await pool.query(`
        ALTER TABLE alerts 
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      `);
      console.log("'user_id' column added successfully.");
      
      // Update existing alerts to belong to the first available user so they aren't orphaned
      console.log("Associating existing alerts with the first registered user...");
      await pool.query(`
        UPDATE alerts 
        SET user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1) 
        WHERE user_id IS NULL;
      `);
      console.log("Orphaned alerts successfully associated.");
    } else {
      console.log("'user_id' column already exists in 'alerts' table.");
    }
    
    console.log("Database migrations for alerts completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
