const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function seedProductHistory() {
  try {
    console.log("====================================================");
    console.log("🌱  SMART PRODUCT HISTORY AUTOMATIC SEEDER 🌱");
    console.log("====================================================\n");

    // 1. Get all products
    const productsRes = await pool.query(
      'SELECT id, name, category, price, stock_level, reorder_point, user_id FROM products ORDER BY id;'
    );
    const products = productsRes.rows;

    if (products.length === 0) {
      console.log("⚠️ No products found in the database.");
      return;
    }

    console.log(`Analyzing history for ${products.length} products...\n`);

    let seededCount = 0;

    for (const prod of products) {
      // 2. Count distinct calendar dates of OUTBOUND transactions
      const txDaysRes = await pool.query(
        "SELECT COUNT(DISTINCT DATE(created_at)) as days_count FROM transactions WHERE product_id = $1 AND type = 'OUTBOUND';",
        [prod.id]
      );
      const distinctDays = parseInt(txDaysRes.rows[0].days_count, 10);

      // If a product already has 5 or more distinct days of sales history, it's ready for Prophet!
      if (distinctDays >= 5) {
        console.log(`✅ Product "${prod.name}" (ID: ${prod.id}) has sufficient history (${distinctDays} days). Skipping.`);
        continue;
      }

      console.log(`⚠️ Product "${prod.name}" (ID: ${prod.id}) has insufficient history (${distinctDays} days). Seeding 90 days...`);

      // Determine a logical base demand and safety stock profile based on category/price
      let baseDemand = 15;
      if (prod.category?.toLowerCase().includes('produce')) {
        baseDemand = 30;
      } else if (prod.category?.toLowerCase().includes('dairy')) {
        baseDemand = 40;
      } else if (prod.category?.toLowerCase().includes('bakery')) {
        baseDemand = 25;
      } else if (prod.price > 150) {
        baseDemand = 8; // Higher priced items sell in lower daily quantities
      }

      // Clear any pre-existing transactions and forecasts for this specific product to start clean
      await pool.query('DELETE FROM transactions WHERE product_id = $1;', [prod.id]);
      await pool.query('DELETE FROM forecasts WHERE product_id = $1;', [prod.id]);

      let runningStock = prod.stock_level > 50 ? prod.stock_level : 150;
      const transactions = [];

      // Generate a highly realistic 90-day history with seasonality and linear growth
      for (let dayIndex = 90; dayIndex >= 0; dayIndex--) {
        const simDate = new Date();
        simDate.setDate(simDate.getDate() - dayIndex);
        simDate.setHours(17, 30 + Math.floor(Math.random() * 60), 0, 0);

        const dayOfWeek = simDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Friday, Saturday, Sunday

        // Weekend surge seasonality
        const seasonalityMult = isWeekend ? 1.4 : 0.85;

        // Slight upward trend (+0.1% daily business growth)
        const trendMult = 1 + (0.001 * (90 - dayIndex));

        // Natural noise (+-15%)
        const varianceMult = 0.85 + Math.random() * 0.3;

        let outboundQty = Math.round(baseDemand * seasonalityMult * trendMult * varianceMult);
        if (outboundQty < 1) outboundQty = 1;

        // Simulate Supplier Inbound restock dynamic when reaching safety levels
        if (runningStock - outboundQty <= prod.reorder_point) {
          const inboundQty = Math.round(baseDemand * (7 + Math.floor(Math.random() * 5)));
          runningStock += inboundQty;

          const inboundDate = new Date(simDate);
          inboundDate.setHours(8, 0, 0, 0); // Delivered in the morning

          transactions.push({
            type: 'INBOUND',
            quantity: inboundQty,
            description: `Supplier restock of ${inboundQty} units.`,
            created_at: inboundDate,
          });
        }

        runningStock -= outboundQty;
        transactions.push({
          type: 'OUTBOUND',
          quantity: outboundQty,
          description: `Daily Sales Transaction`,
          created_at: new Date(simDate),
        });
      }

      // Insert the simulated transaction records
      for (const tx of transactions) {
        await pool.query(
          `INSERT INTO transactions (type, product_id, quantity, description, created_at)
           VALUES ($1, $2, $3, $4, $5);`,
          [tx.type, prod.id, tx.quantity, tx.description, tx.created_at]
        );
      }

      // Update the product's final stock level and price properties to align with transaction simulation
      await pool.query(
        'UPDATE products SET stock_level = $1 WHERE id = $2;',
        [runningStock, prod.id]
      );

      console.log(`✅ Successfully seeded logical 90-day history for "${prod.name}". Final Stock: ${runningStock} units.`);
      seededCount++;
    }

    console.log(`\n====================================================`);
    console.log(`🎉 Seeding complete. Seeded ${seededCount} product(s).`);
    console.log("====================================================\n");

  } catch (err) {
    console.error("❌ Error seeding product transaction history:", err);
  } finally {
    await pool.end();
  }
}

seedProductHistory();
