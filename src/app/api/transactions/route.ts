import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { triggerBackgroundForecast } from '@/lib/forecast-trigger';

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await db.query(`
            SELECT t.id, t.type, t.quantity, t.description, t.created_at as timestamp, p.name as product_name 
            FROM transactions t 
            JOIN products p ON t.product_id = p.id 
            WHERE p.user_id = $1
            ORDER BY t.created_at DESC 
            LIMIT 10
        `, [user.id]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { product_id, type, quantity, description } = await request.json();

        if (!product_id || !type || quantity === undefined) {
            return NextResponse.json({ error: 'product_id, type, and quantity are required' }, { status: 400 });
        }

        if (type !== 'INBOUND' && type !== 'OUTBOUND') {
            return NextResponse.json({ error: "type must be either 'INBOUND' or 'OUTBOUND'" }, { status: 400 });
        }

        const qtyNum = Number(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 });
        }

        // 1. Verify product ownership
        const prodCheck = await db.query('SELECT stock_level FROM products WHERE id = $1 AND user_id = $2', [product_id, user.id]);
        if (prodCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
        }

        const currentStock = Number(prodCheck.rows[0].stock_level);
        
        if (type === 'OUTBOUND' && currentStock < qtyNum) {
            return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
        }

        let newStockLevel = currentStock;
        await db.query('BEGIN');
        
        try {
            if (type === 'INBOUND') {
                const updateRes = await db.query('UPDATE products SET stock_level = stock_level + $1 WHERE id = $2 AND user_id = $3 RETURNING stock_level', [qtyNum, product_id, user.id]);
                newStockLevel = Number(updateRes.rows[0].stock_level);
            } else {
                const updateRes = await db.query('UPDATE products SET stock_level = stock_level - $1 WHERE id = $2 AND user_id = $3 RETURNING stock_level', [qtyNum, product_id, user.id]);
                newStockLevel = Number(updateRes.rows[0].stock_level);
            }

            // Insert the transaction log
            await db.query(
                'INSERT INTO transactions (type, product_id, quantity, description) VALUES ($1, $2, $3, $4)',
                [type, product_id, qtyNum, description || (type === 'INBOUND' ? 'Supplier Restock' : 'Daily Sales')]
            );
            
            await db.query('COMMIT');
            
            // Trigger background forecasting pipeline asynchronously
            triggerBackgroundForecast();
        } catch (txError) {
            await db.query('ROLLBACK');
            throw txError;
        }

        return NextResponse.json({ success: true, new_stock_level: newStockLevel });
    } catch (error: any) {
        console.error('Error creating transaction:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
