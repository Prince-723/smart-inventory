import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');

        let query = `
            SELECT 
                DATE(t.created_at) as date, 
                SUM(t.quantity) as total_sales
            FROM transactions t
        `;

        const params: any[] = [];
        let whereClause = "WHERE t.type = 'OUTBOUND'";

        if (product) {
            query += " JOIN products p ON t.product_id = p.id";
            whereClause += " AND p.name = $1";
            params.push(product);
        }

        query += ` ${whereClause} GROUP BY 1 ORDER BY 1 ASC`;

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching history:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
