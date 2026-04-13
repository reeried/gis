-- Migration: Add layer_group column to files table
-- Run this SQL in phpMyAdmin or MySQL client
-- Note: If the column already exists, you'll get an error - that's okay, just ignore it

USE gis_files;

-- Check if column exists first (optional - just for reference)
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gis_files' 
  AND TABLE_NAME = 'files' 
  AND COLUMN_NAME = 'layer_group';

-- Add layer_group column
-- If you get "Duplicate column name" error, the column already exists - that's fine!
ALTER TABLE files
ADD COLUMN layer_group ENUM('district','river','photo') DEFAULT 'district' 
COMMENT 'Determines which toggle controls the layer';

-- Add index for layer_group
-- If you get "Duplicate key name" error, the index already exists - that's fine!
ALTER TABLE files
ADD INDEX idx_layer_group (layer_group);

-- Verify the column was added
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gis_files' 
  AND TABLE_NAME = 'files' 
  AND COLUMN_NAME = 'layer_group';

