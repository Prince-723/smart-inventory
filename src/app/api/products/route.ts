import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await db.query('SELECT * FROM products WHERE user_id = $1 ORDER BY id ASC', [user.id]);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, category, price, reorder_point, initial_stock } = await request.json();

        if (!name || !category || price === undefined || reorder_point === undefined) {
            return NextResponse.json({ error: 'name, category, price, and reorder_point are required' }, { status: 400 });
        }

        const priceNum = Number(price);
        const reorderNum = Number(reorder_point);
        const initialStockNum = Number(initial_stock || 0);

        if (isNaN(priceNum) || priceNum <= 0) {
            return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 });
        }
        if (isNaN(reorderNum) || reorderNum < 0) {
            return NextResponse.json({ error: 'reorder_point must be a non-negative integer' }, { status: 400 });
        }
        if (isNaN(initialStockNum) || initialStockNum < 0) {
            return NextResponse.json({ error: 'initial_stock must be a non-negative integer' }, { status: 400 });
        }

        const result = await db.query(
            'INSERT INTO products (name, category, stock_level, reorder_point, price, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, category, initialStockNum, reorderNum, priceNum, user.id]
        );

        return NextResponse.json({ success: true, product: result.rows[0] });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
