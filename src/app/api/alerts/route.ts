import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const result = await db.query(`
            SELECT a.*, p.name as product_name 
            FROM alerts a 
            LEFT JOIN products p ON a.product_id = p.id 
            ORDER BY a.created_at DESC
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
