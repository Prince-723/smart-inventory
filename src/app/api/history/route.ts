import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');

        let query = `
            SELECT 
                DATE(t.created_at) as date, 
                SUM(t.quantity) as total_sales
            FROM transactions t
            JOIN products p ON t.product_id = p.id
        `;

        const params: any[] = [user.id];
        let whereClause = "WHERE t.type = 'OUTBOUND' AND p.user_id = $1";

        if (product) {
            whereClause += " AND p.name = $2";
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
