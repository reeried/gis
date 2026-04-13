import mysql from 'mysql2/promise';

// Database configuration
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
    return false;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const dbAvailable = await isDatabaseAvailable();
      
      if (!dbAvailable) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const pool = getPool();
      const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Error getting document:', error);
      res.status(500).json({ error: 'Failed to get document' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const dbAvailable = await isDatabaseAvailable();
      
      if (!dbAvailable) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const pool = getPool();
      const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = rows[0];
      
      // Delete from database
      await pool.execute('DELETE FROM documents WHERE id = ?', [id]);

      // Note: Physical file deletion would need to be handled separately
      // as /tmp is ephemeral in serverless functions

      res.status(200).json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

