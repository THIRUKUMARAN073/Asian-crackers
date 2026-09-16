import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL ERROR: DATABASE_URL environment variable is missing.');
}

// Enable SSL unless explicitly disabled or running on localhost
const isLocalhost = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));
const sslConfig = process.env.DATABASE_SSL === 'false' || isLocalhost
  ? false
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Database Query Error:', {
      message: err.message,
      query: text.replace(/\s+/g, ' ').trim().slice(0, 120),
    });
    throw err;
  }
};

export const testConnection = async () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() as current_time');
    return res.rows[0].current_time;
  } finally {
    client.release();
  }
};
