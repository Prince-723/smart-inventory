    const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function showTrainingData() {
    try {
        console.log("--- RAW TRANSACTIONS (What you have now) ---");
        const rawRes = await pool.query(`
            SELECT t.created_at, p.name, t.quantity, t.type 
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.type = 'OUTBOUND'
            LIMIT 5
        `);
        console.table(rawRes.rows.map(r => ({
            Date: new Date(r.created_at).toISOString().split('T')[0],
            Product: r.name,
            Sold: r.quantity
        })));

        console.log("\n--- TRAINING DATASET (What the model needs) ---");
        console.log("Note: We group by Date and Product. One table, many products.");

        const trainRes = await pool.query(`
            SELECT 
                DATE(t.created_at) as sale_date,
                p.name as product_name,
                SUM(t.quantity) as total_daily_sales
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.type = 'OUTBOUND'
            GROUP BY 1, 2
            ORDER BY 1 DESC, 2
            LIMIT 5
        `);
        console.table(trainRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

showTrainingData();
