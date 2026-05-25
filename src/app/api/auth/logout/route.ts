import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (sessionCookie && sessionCookie.value) {
      const sessionId = sessionCookie.value;
      // Delete session from DB
      await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    
    // Clear session cookie by setting it to empty with maxAge 0
    response.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
