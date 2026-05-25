import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        const prodId = Number(id);
        if (isNaN(prodId)) {
            return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
        }

        // Check if product exists and belongs to the authenticated user
        const checkRes = await db.query('SELECT name FROM products WHERE id = $1 AND user_id = $2', [prodId, user.id]);
        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
        }

        const productName = checkRes.rows[0].name;

        // Perform cascading manual deletions inside a transaction block to avoid constraint issues
        await db.query('BEGIN');
        
        await db.query('DELETE FROM alerts WHERE product_id = $1', [prodId]);
        await db.query('DELETE FROM forecasts WHERE product_id = $1', [prodId]);
        await db.query('DELETE FROM transactions WHERE product_id = $1', [prodId]);
        await db.query('DELETE FROM products WHERE id = $1 AND user_id = $2', [prodId, user.id]);
        
        await db.query('COMMIT');

        return NextResponse.json({ success: true, message: `Product "${productName}" and its related data were successfully deleted.` });
    } catch (error: any) {
        try {
            await db.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Rollback error:', rollbackErr);
        }
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
