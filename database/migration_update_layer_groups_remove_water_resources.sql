-- Migration: Remove 'water_resources' and add new layer groups
-- Run this SQL in phpMyAdmin on cPanel
-- 
-- New layer groups:
-- - Sumur Bor
-- - Mata Air
-- - Bendung
-- - Reservoir
-- - Jaringan Air Bersih
-- - Sawah
-- - Jaringan Irigasi

USE gis_files;

-- Update layer_group ENUM to remove 'water_resources' and add new layer groups
ALTER TABLE files
MODIFY COLUMN layer_group ENUM('district','river','photo','administrative','das','contour','sumur_bor','mata_air','bendung','reservoir','jaringan_air_bersih','sawah','jaringan_irigasi') DEFAULT 'district' 
COMMENT 'Determines which toggle controls the layer';

-- Note: If you have existing records with 'water_resources' layer_group, 
-- you may want to update them to one of the new layer groups before running this migration.
-- Example:
-- UPDATE files SET layer_group = 'sumur_bor' WHERE layer_group = 'water_resources';

