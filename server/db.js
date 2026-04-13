/**
 * MySQL Database Connection Module
 * For Hostinger phpMyAdmin MySQL database
 */

import mysql from 'mysql2/promise';

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true // Ini penting untuk keamanan di TiDB Cloud
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
let pool = null;
let dbAvailable = false;

/**
 * Get or create database connection pool
 */
export function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      console.log('MySQL connection pool created');
    } catch (error) {
      console.error('Failed to create MySQL connection pool:', error);
      throw error;
    }
  }
  return pool;
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable() {
  return dbAvailable;
}

/**
 * Set database availability status
 */
export function setDatabaseAvailable(available) {
  dbAvailable = available;
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    console.log('MySQL connection test successful');
    return true;
  } catch (error) {
    console.error('MySQL connection test failed:', error.message);
    return false;
  }
}

/**
 * Initialize database (create table if not exists)
 */
export async function initializeDatabase() {
  try {
    // Try to create pool - this might fail if mysql2 is not properly configured
    let pool;
    try {
      pool = getPool();
    } catch (poolError) {
      console.error('Failed to create database pool:', poolError.message);
      setDatabaseAvailable(false);
      return false;
    }
    
    // Test connection first
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    // Create files table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        filename VARCHAR(500) NOT NULL,
        path VARCHAR(1000) NOT NULL,
        size BIGINT NOT NULL,
        uploaded_at DATETIME NOT NULL,
        visible BOOLEAN DEFAULT TRUE,
        source_url TEXT,
        layer_group ENUM('district','river','photo','administrative','das','contour','sumur_bor','mata_air','bendung','reservoir','jaringan_air_bersih','sawah','jaringan_irigasi') DEFAULT 'district' COMMENT 'Determines which toggle controls the layer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_visible (visible),
        INDEX idx_layer_group (layer_group),
        INDEX idx_uploaded_at (uploaded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Migration: Add layer_group column if it doesn't exist (for existing databases)
    try {
      await pool.execute(`
        ALTER TABLE files
        ADD COLUMN layer_group ENUM('district','river','photo','administrative','das','contour','sumur_bor','mata_air','bendung','reservoir','jaringan_air_bersih','sawah','jaringan_irigasi') DEFAULT 'district' 
        COMMENT 'Determines which toggle controls the layer'
      `);
      console.log('Added layer_group column to files table');
    } catch (error) {
      // Column already exists, ignore error
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.warn('Error adding layer_group column (may already exist):', error.message);
      }
    }
    
    // Migration: Add index for layer_group if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE files
        ADD INDEX idx_layer_group (layer_group)
      `);
      console.log('Added idx_layer_group index to files table');
    } catch (error) {
      // Index already exists, ignore error
      if (error.code !== 'ER_DUP_KEYNAME') {
        console.warn('Error adding idx_layer_group index (may already exist):', error.message);
      }
    }
    
    // Migration: Update layer_group ENUM to include new layer groups
    try {
      await pool.execute(`
        ALTER TABLE files
        MODIFY COLUMN layer_group ENUM('district','river','photo','administrative','das','contour','sumur_bor','mata_air','bendung','reservoir','jaringan_air_bersih','sawah','jaringan_irigasi') DEFAULT 'district' 
        COMMENT 'Determines which toggle controls the layer'
      `);
      console.log('Updated layer_group ENUM to include new layer groups (sumur_bor, mata_air, bendung, reservoir, jaringan_air_bersih, sawah, jaringan_irigasi)');
    } catch (error) {
      // Column might not exist or already updated, ignore error
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        console.warn('Error updating layer_group ENUM (may already be updated):', error.message);
      }
    }
    
    // Create river_map table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS river_map (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL COMMENT 'Map title',
        description TEXT COMMENT 'Map description',
        geo_json LONGTEXT COMMENT 'GeoJSON data for the map',
        map_image_url VARCHAR(1000) COMMENT 'URL to the river map image',
        kml_file_id VARCHAR(255) COMMENT 'Reference to files table if using uploaded KML',
        visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_visible (visible)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure map_image_url column exists for older deployments
    await pool.execute(`
      ALTER TABLE river_map
      ADD COLUMN IF NOT EXISTS map_image_url VARCHAR(1000) COMMENT 'URL to the river map image' AFTER geo_json
    `);
    
    // Add map_image_urls column for multiple images (JSON array)
    await pool.execute(`
      ALTER TABLE river_map
      ADD COLUMN IF NOT EXISTS map_image_urls TEXT COMMENT 'JSON array of river map image URLs' AFTER map_image_url
    `);
    
    // Create river_data table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS river_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'River name',
        location VARCHAR(255) NOT NULL COMMENT 'River location',
        length VARCHAR(50) COMMENT 'River length',
        width VARCHAR(50) COMMENT 'River width',
        depth VARCHAR(50) COMMENT 'River depth',
        status ENUM('Normal', 'Perlu Perhatian', 'Kritis') DEFAULT 'Normal',
        last_update DATE,
        notes TEXT COMMENT 'Additional notes',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_location (location),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create condition_photos table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS condition_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL COMMENT 'Photo title',
        location VARCHAR(255) NOT NULL COMMENT 'Photo location',
        date DATE NOT NULL,
        status ENUM('Normal', 'Perlu Perhatian', 'Kritis') DEFAULT 'Normal',
        image_url VARCHAR(1000) COMMENT 'URL to the photo',
        description TEXT COMMENT 'Photo description',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_location (location),
        INDEX idx_status (status),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create app_settings table for storing application configuration
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL COMMENT 'Setting key (e.g., google_sheets_url)',
        setting_value TEXT COMMENT 'Setting value',
        description TEXT COMMENT 'Setting description',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create documents table for storing uploaded documents (PDF, DOC, JPEG, etc.)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(500) NOT NULL COMMENT 'Original filename',
        filename VARCHAR(500) NOT NULL COMMENT 'Stored filename on server',
        path VARCHAR(1000) NOT NULL COMMENT 'URL path to file',
        size BIGINT NOT NULL COMMENT 'File size in bytes',
        file_type VARCHAR(50) COMMENT 'File type (pdf, doc, image, etc.)',
        uploaded_at DATETIME NOT NULL COMMENT 'Upload timestamp',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_uploaded_at (uploaded_at),
        INDEX idx_file_type (file_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    setDatabaseAvailable(true);
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    console.log('Falling back to file-based storage for local development');
    setDatabaseAvailable(false);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL connection pool closed');
  }
}

