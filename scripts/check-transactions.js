const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function checkDatabaseIntegrity() {
  try {
    console.log("====================================================");
    console.log("🕵️‍♂️  SMART INVENTORY DATABASE INTEGRITY CHECK 🕵️‍♂️");
    console.log("====================================================\n");

    // 1. Get all registered users
    const usersRes = await pool.query('SELECT id, username FROM users ORDER BY id;');
    const users = usersRes.rows;

    if (users.length === 0) {
      console.warn("⚠️ No users found in the database.");
      return;
    }

    console.log(`👤 Found ${users.length} registered user(s):\n`);

    for (const user of users) {
      console.log(`----------------------------------------------------`);
      console.log(`👤 USER: ${user.username} (ID: ${user.id})`);
      console.log(`----------------------------------------------------`);

      // 2. Get products for this user
      const productsRes = await pool.query(
        'SELECT id, name, stock_level, reorder_point, price, category FROM products WHERE user_id = $1 ORDER BY name;',
        [user.id]
      );
      const products = productsRes.rows;

      if (products.length === 0) {
        console.log("  ⚠️ No products found for this user.");
        continue;
      }

      console.log(`  📦 Products Found: ${products.length}\n`);

      for (const prod of products) {
        // 3. Count transaction types
        const txRes = await pool.query(
          'SELECT type, COUNT(*) as count FROM transactions WHERE product_id = $1 GROUP BY type;',
          [prod.id]
        );
        
        let inboundCount = 0;
        let outboundCount = 0;

        for (const row of txRes.rows) {
          if (row.type === 'INBOUND') {
            inboundCount = parseInt(row.count, 10);
          } else if (row.type === 'OUTBOUND') {
            outboundCount = parseInt(row.count, 10);
          }
        }

        // 4. Count forecast rows
        const forecastRes = await pool.query(
          'SELECT COUNT(*) as count FROM forecasts WHERE product_id = $1;',
          [prod.id]
        );
        const forecastCount = parseInt(forecastRes.rows[0].count, 10);

        // Print neat metrics per product
        console.log(`  🔹 Product: "${prod.name}" (ID: ${prod.id})`);
        console.log(`     Category:      ${prod.category || 'N/A'}`);
        console.log(`     Price:         $${parseFloat(prod.price).toFixed(2)}`);
        console.log(`     Stock Level:   ${prod.stock_level} units (Reorder Point: ${prod.reorder_point})`);
        console.log(`     Transactions:  📥 ${inboundCount} Inbound Restocks | 📤 ${outboundCount} Outbound Sales`);
        console.log(`     ML Forecasts:  📈 ${forecastCount} future days forecasted`);
        console.log("");
      }
    }

    console.log("====================================================");
    console.log("✅ Database integrity check complete!");
    console.log("====================================================");

  } catch (err) {
    console.error("❌ Error during database integrity check:", err);
  } finally {
    await pool.end();
  }
}

checkDatabaseIntegrity();
