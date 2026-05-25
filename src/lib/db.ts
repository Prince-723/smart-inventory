import { Pool } from 'pg';

let pool: Pool;

if (!process.env.POSTGRES_URL) {
  // Warn only in development to avoid cluttering production logs if handled differently
  if (process.env.NODE_ENV === 'development') {
    console.warn('POSTGRES_URL environment variable is not defined.');
  }
}

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // In development mode, use a global variable so we don't hot-reload the connection pool
  if (!(global as any).postgres) {
    (global as any).postgres = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  pool = (global as any).postgres;
}

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
