const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const CORE_PRODUCTS = [
  { name: 'Bananas', category: 'Produce', stock: 350, reorderPoint: 100, price: 40.00, baseDemand: 45 },
  { name: 'Milk', category: 'Dairy', stock: 450, reorderPoint: 150, price: 60.00, baseDemand: 60 },
  { name: 'Apples', category: 'Produce', stock: 200, reorderPoint: 50, price: 120.00, baseDemand: 20 },
  { name: 'Bread', category: 'Bakery', stock: 180, reorderPoint: 40, price: 45.00, baseDemand: 35 },
  { name: 'Ice Cream', category: 'Dairy', stock: 120, reorderPoint: 30, price: 250.00, baseDemand: 25 },
];

async function seedHistory() {
  try {
    console.log("Starting high-fidelity logical database seeding...");

    // 1. Fetch all registered users
    const usersRes = await pool.query('SELECT id, username FROM users;');
    const users = usersRes.rows;

    if (users.length === 0) {
      console.warn("⚠️ No users found in the database. Please register an account first!");
      return;
    }

    console.log(`Found ${users.length} registered user(s):`, users.map(u => u.username));

    for (const user of users) {
      console.log(`\n--- Seeding logical history for user: "${user.username}" (ID: ${user.id}) ---`);

      // Delete existing products for this user (cascades to transactions, alerts, and forecasts!)
      await pool.query('DELETE FROM products WHERE user_id = $1;', [user.id]);
      console.log(`Cleared previous products and cascading logs for "${user.username}".`);

      for (const item of CORE_PRODUCTS) {
        // Insert new product
        const prodInsert = await pool.query(
          `INSERT INTO products (name, category, stock_level, reorder_point, price, user_id) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING id;`,
          [item.name, item.category, item.stock, item.reorderPoint, item.price, user.id]
        );
        const productId = prodInsert.rows[0].id;
        console.log(`Created product "${item.name}" (ID: ${productId})`);

        let runningStock = item.stock;
        const transactions = [];

        // Generate 90 days of transactions
        // From NOW() - 90 days to NOW()
        for (let dayIndex = 90; dayIndex >= 0; dayIndex--) {
          const simDate = new Date();
          simDate.setDate(simDate.getDate() - dayIndex);
          // Set deterministic/logical hour of transaction (outbound sales spread around 5:00 PM)
          simDate.setHours(17, 30 + Math.floor(Math.random() * 60), 0, 0);

          const dayOfWeek = simDate.getDay(); // 0 = Sunday, 6 = Saturday, etc.
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat, Sun

          // Apply weekly seasonality multiplier
          const seasonalityMult = isWeekend ? 1.4 : 0.85;

          // Apply business expansion trend (+0.15% daily sales volume)
          const trendMult = 1 + (0.0015 * (90 - dayIndex));

          // Natural organic variance/noise (+-12%)
          const varianceMult = 0.88 + Math.random() * 0.24;

          // Calculate final logical sales quantity
          let outboundQty = Math.round(item.baseDemand * seasonalityMult * trendMult * varianceMult);
          if (outboundQty < 1) outboundQty = 1;

          // Check if replenishment is needed (reorder point triggered)
          if (runningStock - outboundQty <= item.reorderPoint) {
            // Simulate inbound Restock delivery of 8-10 days of base demand
            const inboundQty = Math.round(item.baseDemand * (8 + Math.floor(Math.random() * 4)));
            runningStock += inboundQty;

            // Restock arrives early morning (8:00 AM) on the same day
            const inboundDate = new Date(simDate);
            inboundDate.setHours(8, 0, 0, 0);

            transactions.push({
              type: 'INBOUND',
              product_id: productId,
              quantity: inboundQty,
              description: `Supplier restock of ${inboundQty} units delivered.`,
              created_at: inboundDate,
            });
          }

          // Execute retail sale
          runningStock -= outboundQty;
          transactions.push({
            type: 'OUTBOUND',
            product_id: productId,
            quantity: outboundQty,
            description: `Daily sales: ${outboundQty} units retail outtake.`,
            created_at: simDate,
          });
        }

        // Insert all transactions in a single batch
        console.log(`Generating ${transactions.length} transactions for "${item.name}"...`);
        for (const tx of transactions) {
          await pool.query(
            `INSERT INTO transactions (type, product_id, quantity, description, created_at) 
             VALUES ($1, $2, $3, $4, $5);`,
            [tx.type, tx.product_id, tx.quantity, tx.description, tx.created_at]
          );
        }

        // Sync final product stock_level in the database
        await pool.query(
          'UPDATE products SET stock_level = $1 WHERE id = $2;',
          [runningStock, productId]
        );
        console.log(`Synced inventory stock level of "${item.name}" to ${runningStock} units.`);
      }
    }

    console.log("\n🚀 All logical 90-day histories seeded successfully!");
  } catch (err) {
    console.error("Error during seeding process:", err);
  } finally {
    await pool.end();
  }
}

seedHistory();
