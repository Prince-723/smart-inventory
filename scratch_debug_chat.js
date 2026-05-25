const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

const db = {
  query: (text, params) => pool.query(text, params),
};

async function getProductContext(productName) {
  try {
    // 1. Get Product Details
    const productRes = await db.query('SELECT * FROM products WHERE name = $1', [productName]);
    const product = productRes.rows[0];

    console.log("Found product:", product);
    if (!product) {
      console.log("No product found with name:", productName);
      return null;
    }

    // 2. Get Recent Transactions (Last 5)
    console.log("Querying transactions...");
    const transactionsRes = await db.query(`
        SELECT type, quantity, description, created_at as timestamp 
        FROM transactions 
        WHERE product_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
    `, [product.id]);
    console.log("Found transactions:", transactionsRes.rows.length);

    // 3. Get Forecasts (Next 5 days)
    console.log("Querying forecasts...");
    const forecastsRes = await db.query(`
        SELECT date, predicted_demand, confidence_score, lower_bound, upper_bound
        FROM forecasts 
        WHERE product_id = $1 
        AND date >= CURRENT_DATE
        ORDER BY date ASC 
        LIMIT 5
    `, [product.id]);
    console.log("Found forecasts:", forecastsRes.rows.length);

    // 4. Get Active Alerts
    console.log("Querying alerts...");
    const alertsRes = await db.query(`
        SELECT type, message, severity, created_at
        FROM alerts 
        WHERE product_id = $1 
        ORDER BY created_at DESC
        LIMIT 3
    `, [product.id]);
    console.log("Found alerts:", alertsRes.rows.length);

    return {
      product,
      recentTransactions: transactionsRes.rows,
      forecasts: forecastsRes.rows,
      alerts: alertsRes.rows
    };
  } catch (error) {
    console.error("Error fetching context:", error);
    return null;
  }
}

async function main() {
  const ctx = await getProductContext("Bananas");
  console.log("Context returned:", JSON.stringify(ctx, null, 2));
  await pool.end();
}

main();
