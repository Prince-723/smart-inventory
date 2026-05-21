const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

const seedData = async () => {
    try {
        console.log('Cleaning up old tables...');
        try {
            await pool.query('DROP TABLE IF EXISTS transactions, forecasts, alerts, products CASCADE');
        } catch (e) {
            console.log('Error dropping tables, continuing...', e.message);
        }

        console.log('Creating products table...');
        await pool.query(`
          CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            stock_level INTEGER DEFAULT 0,
            reorder_point INTEGER DEFAULT 10,
            price DECIMAL(10, 2),
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        console.log('Creating transactions table...');
        await pool.query(`
          CREATE TABLE transactions (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL, -- 'INBOUND', 'OUTBOUND'
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT
          );
        `);

        console.log('Creating forecasts table...');
        await pool.query(`
          CREATE TABLE forecasts (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            date DATE NOT NULL,
            predicted_demand INTEGER,
            confidence_score DECIMAL(5, 2),
            lower_bound INTEGER,
            upper_bound INTEGER
          );
        `);

        console.log('Creating alerts table...');
        await pool.query(`
          CREATE TABLE alerts (
              id SERIAL PRIMARY KEY,
              type VARCHAR(50), 
              message TEXT,
              severity VARCHAR(20),
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              product_name VARCHAR(255)
          );
        `);

        console.log('Seeding products...');
        const productsRes = await pool.query(`
            INSERT INTO products (name, category, stock_level, reorder_point, price) VALUES
            ('Bananas', 'Produce', 1250, 100, 0.50),
            ('Carrots', 'Produce', 850, 200, 0.80),
            ('Chicken', 'Meat', 450, 50, 5.99),
            ('Milk', 'Dairy', 2100, 500, 3.50),
            ('Eggs', 'Dairy', 680, 150, 4.20),
            ('Bread', 'Bakery', 920, 200, 2.99)
            RETURNING id, name;
        `);

        const products = {};
        productsRes.rows.forEach(p => products[p.name] = p.id);

        console.log('Seeding transactions...');
        await pool.query(`
            INSERT INTO transactions (type, product_id, quantity, description, timestamp) VALUES
            ('OUTBOUND', ${products['Bananas']}, 200, 'Daily Sales', NOW() - INTERVAL '1 day'),
            ('INBOUND', ${products['Carrots']}, 50, 'Restock', NOW()),
            ('OUTBOUND', ${products['Chicken']}, 120, 'Restaurant Order', NOW() - INTERVAL '2 hours'),
            ('INBOUND', ${products['Milk']}, 300, 'Weekly Delivery', NOW()),
            ('OUTBOUND', ${products['Eggs']}, 45, 'Sales', NOW() - INTERVAL '5 hours'),
            ('INBOUND', ${products['Bread']}, 80, 'Morning Bake', NOW() - INTERVAL '12 hours')
        `);

        console.log('Seeding forecasts...');
        // Seed some dummy forecast data
        await pool.query(`
            INSERT INTO forecasts (product_id, date, predicted_demand, lower_bound, upper_bound) VALUES
            (${products['Bananas']}, NOW() + INTERVAL '1 day', 150, 130, 170),
            (${products['Bananas']}, NOW() + INTERVAL '2 days', 160, 140, 180),
             (${products['Bananas']}, NOW() + INTERVAL '3 days', 145, 125, 165),
             (${products['Bananas']}, NOW() + INTERVAL '4 days', 170, 150, 190),
             (${products['Bananas']}, NOW() + INTERVAL '5 days', 180, 160, 200)
         `);

        console.log('Seeding alerts...');
        await pool.query(`
             INSERT INTO alerts (product_name, type, message, severity) VALUES
             ('Chicken', 'low_stock', 'Stock level below reorder point', 'warning'),
             ('Avocados', 'delay', 'Shipment delayed by 2 days', 'info'),
             ('Milk', 'expiring', 'Batch #402 expiring in 2 days', 'urgent')
        `);

        console.log('Seeding complete!');
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        await pool.end();
    }
};

seedData();
