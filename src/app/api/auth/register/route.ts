import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
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
        if (cleanUsername.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
        }

        // 2. Check if username exists
        const userCheck = await db.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
        if (userCheck.rows.length > 0) {
            return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
        }

        // 3. Hash password and insert user into password_hash column
        const saltedHash = hashPassword(password);
        const insertUserRes = await db.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [cleanUsername, saltedHash]
        );
        const newUser = insertUserRes.rows[0];

        // 4. Create an active session cleanly for the newly registered user
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Session valid for 7 days

        await db.query(
            'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
            [sessionId, newUser.id, expiresAt]
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
                id: newUser.id,
                username: newUser.username
            }
        });

    } catch (error: any) {
        console.error('Error during registration endpoint:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
