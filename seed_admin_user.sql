-- =============================================================================
-- EduForge: Seed Admin User for MySQL Authentication
-- Database: eduforge
-- User: admin@gmail.com / admin@123
-- =============================================================================

USE `eduforge`;

-- 1. Add password_hash column to user_profiles if it does not already exist
SET @dbname = DATABASE();
SET @tablename = "user_profiles";
SET @columnname = "password_hash";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `user_profiles` ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `email`"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Insert or Update the Admin user profile
INSERT INTO `user_profiles` (`id`, `email`, `password_hash`, `name`, `role`, `assigned_subject`)
VALUES (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
  'admin@gmail.com',
  '$2b$10$T3Ty9O6jVHDPz/GRFoD21uIP7nYEe4WUXzMa900x/2oeia1l2DLru',
  'Administrator',
  'admin',
  'All'
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `role` = 'admin',
  `assigned_subject` = 'All',
  `name` = 'Administrator';

-- 3. Verify Admin Account in Database
SELECT `id`, `email`, `name`, `role`, `assigned_subject`, `created_at` 
FROM `user_profiles` 
WHERE `email` = 'admin@gmail.com';
