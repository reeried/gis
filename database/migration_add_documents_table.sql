-- Migration: Add documents table
-- Run this SQL in phpMyAdmin on cPanel

USE gis_files;

-- Create documents table if it doesn't exist
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

