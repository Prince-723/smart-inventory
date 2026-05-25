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
            return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
        }

        const alertId = Number(id);
        if (isNaN(alertId)) {
            return NextResponse.json({ error: 'Invalid Alert ID' }, { status: 400 });
        }

        // Verify the alert exists and belongs to the authenticated user
        const checkRes = await db.query('SELECT type FROM alerts WHERE id = $1 AND user_id = $2', [alertId, user.id]);
        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: 'Alert not found or unauthorized' }, { status: 404 });
        }

        const alertType = checkRes.rows[0].type;

        // Delete the alert
        await db.query('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [alertId, user.id]);

        return NextResponse.json({ success: true, message: `Alert "${alertType}" was successfully completed/dismissed.` });
    } catch (error: any) {
        console.error('Error deleting alert:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
