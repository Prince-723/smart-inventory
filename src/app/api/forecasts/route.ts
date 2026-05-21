import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');

        let query = 'SELECT f.* FROM forecasts f';
        const params: any[] = [];

        if (product) {
            query += ' JOIN products p ON f.product_id = p.id WHERE p.name = $1';
            params.push(product);
        }

        query += ' ORDER BY f.date ASC';

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching forecasts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
