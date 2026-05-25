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

        // Fetch past receipts with item details
        const result = await db.query(`
            SELECT 
                r.id as receipt_id, 
                r.receipt_number, 
                r.total_amount, 
                r.created_at,
                ri.id as item_id, 
                ri.quantity, 
                ri.price, 
                p.name as product_name, 
                p.category as product_category
            FROM receipts r
            LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
            LEFT JOIN products p ON ri.product_id = p.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `, [user.id]);

        const receiptsMap = new Map();
        for (const row of result.rows) {
            if (!receiptsMap.has(row.receipt_number)) {
                receiptsMap.set(row.receipt_number, {
                    id: row.receipt_id,
                    receipt_number: row.receipt_number,
                    total_amount: Number(row.total_amount),
                    created_at: row.created_at,
                    items: []
                });
            }
            if (row.item_id) {
                receiptsMap.get(row.receipt_number).items.push({
                    id: row.item_id,
                    product_name: row.product_name,
                    product_category: row.product_category,
                    quantity: Number(row.quantity),
                    price: Number(row.price),
                });
            }
        }

        const receipts = Array.from(receiptsMap.values());
        return NextResponse.json(receipts);
    } catch (error: any) {
        console.error('Error fetching billing history:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { items } = await request.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty or invalid' }, { status: 400 });
        }

        // Validate items format and positive quantity values
        for (const item of items) {
            if (!item.product_id || item.quantity === undefined) {
                return NextResponse.json({ error: 'Each item must contain product_id and quantity' }, { status: 400 });
            }
            const qtyNum = Number(item.quantity);
            if (isNaN(qtyNum) || qtyNum <= 0) {
                return NextResponse.json({ error: 'Item quantities must be positive numbers' }, { status: 400 });
            }
        }

        await db.query('BEGIN');

        try {
            const checkedItems = [];
            let totalAmount = 0;

            // 1. Audit stock levels and check ownership for each product
            for (const item of items) {
                const prodCheck = await db.query(
                    'SELECT name, price, stock_level FROM products WHERE id = $1 AND user_id = $2',
                    [item.product_id, user.id]
                );

                if (prodCheck.rows.length === 0) {
                    throw new Error(`Product ID ${item.product_id} not found or unauthorized`);
                }

                const prod = prodCheck.rows[0];
                const currentStock = Number(prod.stock_level);
                const requestedQty = Number(item.quantity);

                if (currentStock < requestedQty) {
                    throw new Error(`Insufficient stock for product "${prod.name}" (Available: ${currentStock}, Requested: ${requestedQty})`);
                }

                const itemTotal = Number(prod.price) * requestedQty;
                totalAmount += itemTotal;

                checkedItems.push({
                    product_id: item.product_id,
                    product_name: prod.name,
                    quantity: requestedQty,
                    price: Number(prod.price),
                    itemTotal
                });
            }

            // 2. Generate Receipt Number: INV-YYYYMMDD-XXXX
            const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const receiptNumber = `INV-${todayStr}-${randomSuffix}`;

            // 3. Insert Receipts Master Record
            const receiptRes = await db.query(
                'INSERT INTO receipts (receipt_number, user_id, total_amount) VALUES ($1, $2, $3) RETURNING id, receipt_number, total_amount, created_at',
                [receiptNumber, user.id, totalAmount]
            );

            const receiptId = receiptRes.rows[0].id;
            const createdAt = receiptRes.rows[0].created_at;

            // 4. Update Stock Levels, Insert Receipt Items, and Log Outbound Transactions
            const returnedItems = [];
            for (const item of checkedItems) {
                // Deduct stock
                await db.query(
                    'UPDATE products SET stock_level = stock_level - $1 WHERE id = $2 AND user_id = $3',
                    [item.quantity, item.product_id, user.id]
                );

                // Insert receipt item
                const riRes = await db.query(
                    'INSERT INTO receipt_items (receipt_id, product_id, quantity, price) VALUES ($1, $2, $3, $4) RETURNING id',
                    [receiptId, item.product_id, item.quantity, item.price]
                );

                // Insert Outbound Transaction log (helps RAG and forecasting engines!)
                await db.query(
                    'INSERT INTO transactions (type, product_id, quantity, description) VALUES ($1, $2, $3, $4)',
                    ['OUTBOUND', item.product_id, item.quantity, `Receipt Sales ${receiptNumber}`]
                );

                returnedItems.push({
                    id: riRes.rows[0].id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price
                });
            }

            await db.query('COMMIT');

            // Trigger background forecasting pipeline asynchronously
            triggerBackgroundForecast();

            return NextResponse.json({
                success: true,
                receipt: {
                    id: receiptId,
                    receipt_number: receiptNumber,
                    total_amount: totalAmount,
                    created_at: createdAt,
                    items: returnedItems
                }
            });

        } catch (txError: any) {
            await db.query('ROLLBACK');
            return NextResponse.json({ error: txError.message || 'Transaction aborted' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error creating receipt checkout:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
