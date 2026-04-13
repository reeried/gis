-- MySQL Database Schema for GIS File Storage
-- Run this SQL in phpMyAdmin on Hostinger

-- Create database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS gis_files CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE gis_files;

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL COMMENT 'Original filename',
  filename VARCHAR(500) NOT NULL COMMENT 'Stored filename on server',
  path VARCHAR(1000) NOT NULL COMMENT 'URL path to file',
  size BIGINT NOT NULL COMMENT 'File size in bytes',
  uploaded_at DATETIME NOT NULL COMMENT 'Upload timestamp',
  visible BOOLEAN DEFAULT TRUE COMMENT 'Whether file is visible in frontend',
  source_url TEXT COMMENT 'Original URL if uploaded from URL',
  layer_group ENUM('district','river','photo','administrative','das','contour','sumur_bor','mata_air','bendung','reservoir','jaringan_air_bersih','sawah','jaringan_irigasi') DEFAULT 'district' COMMENT 'Determines which toggle controls the layer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_visible (visible),
  INDEX idx_layer_group (layer_group),
  INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example query to view all files
-- SELECT * FROM files ORDER BY uploaded_at DESC;

-- Example query to view only visible files
-- SELECT * FROM files WHERE visible = TRUE ORDER BY uploaded_at DESC;

-- Create river_map table (for Peta Sungai)
CREATE TABLE IF NOT EXISTS river_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT 'Map title',
  description TEXT COMMENT 'Map description',
  geo_json LONGTEXT COMMENT 'GeoJSON data for the map',
  map_image_url VARCHAR(1000) COMMENT 'URL to the river map image (backward compatibility)',
  map_image_urls TEXT COMMENT 'JSON array of river map image URLs',
  kml_file_id VARCHAR(255) COMMENT 'Reference to files table if using uploaded KML',
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_visible (visible),
  FOREIGN KEY (kml_file_id) REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create river_data table (for Data Sungai)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create condition_photos table (for Foto Kondisi)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create app_settings table (for application configuration)
CREATE TABLE IF NOT EXISTS app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL COMMENT 'Setting key (e.g., google_sheets_url)',
  setting_value TEXT COMMENT 'Setting value',
  description TEXT COMMENT 'Setting description',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create documents table (for Dokumen menu - PDF, DOC, JPEG, etc.)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

