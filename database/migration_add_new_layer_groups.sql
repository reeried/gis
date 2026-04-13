-- Migration: Add new layer groups (DAS, Kontur, Sumber Daya Air)
-- Run this SQL in phpMyAdmin on cPanel

USE gis_files;

-- Update layer_group ENUM to include new layer groups
ALTER TABLE files
MODIFY COLUMN layer_group ENUM('district','river','photo','administrative','das','contour','water_resources') DEFAULT 'district' 
COMMENT 'Determines which toggle controls the layer';

