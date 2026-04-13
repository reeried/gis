import mysql from 'mysql2/promise';

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gis_files',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool = null;

function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      console.log('MySQL connection pool created for documents');
    } catch (error) {
      console.error('Failed to create MySQL connection pool:', error);
      throw error;
    }
  }
  return pool;
}

async function isDatabaseAvailable() {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database not available:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const dbAvailable = await isDatabaseAvailable();
      
      if (!dbAvailable) {
        console.warn('Database not available, returning empty array');
        return res.status(200).json([]);
      }

      const pool = getPool();
      const [rows] = await pool.execute('SELECT * FROM documents ORDER BY uploaded_at DESC');
      
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error getting documents:', error);
      res.status(500).json({ error: 'Failed to get documents', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

