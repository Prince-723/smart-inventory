const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function main() {
  try {
    console.log("Connecting to PostgreSQL...");
    
    // 1. Create users table
    console.log("Creating 'users' table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Create sessions table
    console.log("Creating 'sessions' table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL
      );
    `);
    
    // 3. Add user_id column to products table if not present
    console.log("Checking if 'user_id' exists in 'products' table...");
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'user_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log("Adding 'user_id' column to 'products' table...");
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      `);
      console.log("'user_id' column added successfully.");
    } else {
      console.log("'user_id' column already exists in 'products' table.");
    }
    
    console.log("Database migrations completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
