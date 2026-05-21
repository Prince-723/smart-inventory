import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const result = await db.query(`
            SELECT t.id, t.type, t.quantity, t.description, t.created_at as timestamp, p.name as product_name 
            FROM transactions t 
            LEFT JOIN products p ON t.product_id = p.id 
            ORDER BY t.created_at DESC 
            LIMIT 10
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
