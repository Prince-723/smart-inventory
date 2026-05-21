import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id ASC');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
