import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await db.query(`
            SELECT a.*, p.name as product_name 
            FROM alerts a 
            LEFT JOIN products p ON a.product_id = p.id 
            WHERE a.user_id = $1 
            ORDER BY a.created_at DESC
        `, [user.id]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, message, severity, product_id } = await request.json();

        // Validations
        if (!type || !message || !severity) {
            return NextResponse.json({ error: 'type, message, and severity are required fields.' }, { status: 400 });
        }

        const validSeverities = ['urgent', 'warning', 'info'];
        if (!validSeverities.includes(severity)) {
            return NextResponse.json({ error: "severity must be one of: 'urgent', 'warning', 'info'" }, { status: 400 });
        }

        let parsedProductId = null;
        if (product_id) {
            parsedProductId = Number(product_id);
            if (isNaN(parsedProductId)) {
                return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
            }

            // Verify the product belongs to the current user
            const prodCheck = await db.query('SELECT id FROM products WHERE id = $1 AND user_id = $2', [parsedProductId, user.id]);
            if (prodCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
            }
        }

        const result = await db.query(`
            INSERT INTO alerts (type, message, severity, product_id, user_id) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `, [type, message, severity, parsedProductId, user.id]);

        return NextResponse.json({ success: true, alert: result.rows[0] });
    } catch (error: any) {
        console.error('Error creating custom alert:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
