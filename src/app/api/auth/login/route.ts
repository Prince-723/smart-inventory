import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        // 1. Validations
        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required fields.' }, { status: 400 });
        }

        const cleanUsername = username.trim();

        // 2. Fetch user using correct password_hash column
        const result = await db.query('SELECT id, username, password_hash FROM users WHERE username = $1', [cleanUsername]);
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
        }

        const user = result.rows[0];

        // 3. Verify password
        const isPasswordCorrect = verifyPassword(password, user.password_hash);
        if (!isPasswordCorrect) {
            return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
        }

        // 4. Create session
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Session valid for 7 days

        await db.query(
            'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
            [sessionId, user.id, expiresAt]
        );

        // 5. Set session cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expiresAt,
            path: '/'
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error: any) {
        console.error('Error during login endpoint:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
