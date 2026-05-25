import { cookies } from 'next/headers';
import { db } from './db';
import crypto from 'crypto';

export interface User {
  id: number;
  username: string;
  created_at: Date;
}

/**
 * Generates a secure salt and hashes the password using scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against the stored salt/hash combination
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  try {
    const parts = storedValue.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === checkHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Resolves the currently authenticated user from the request session cookie.
 * Can be used in API routes, server components, or server actions.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const sessionId = sessionCookie.value;

    // Look up session in DB
    const result = await db.query(
      `SELECT s.expires_at, u.id, u.username, u.created_at 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    const expiresAt = new Date(session.expires_at);

    // If session has expired, cleanly delete it and return null
    if (expiresAt < new Date()) {
      await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
      return null;
    }

    return {
      id: session.id,
      username: session.username,
      created_at: session.created_at,
    };
  } catch (error) {
    console.error('Error in getSessionUser:', error);
    return null;
  }
}
