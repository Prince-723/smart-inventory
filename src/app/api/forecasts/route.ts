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

        let query = 'SELECT f.* FROM forecasts f JOIN products p ON f.product_id = p.id WHERE p.user_id = $1';
        const params: any[] = [user.id];

        if (product) {
            query += ' AND p.name = $2';
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
