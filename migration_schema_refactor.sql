-- BandFlow Phase 6+ Schema Refactor Migration
USE bandflow;

-- 1. Create band_roles table
CREATE TABLE IF NOT EXISTS band_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  band_id INT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
  UNIQUE KEY idx_band_role (band_id, role_name)
) ENGINE=InnoDB;

-- 2. Seed default roles for all existing bands
INSERT INTO band_roles (band_id, role_name)
SELECT id, 'Vocalist' FROM bands
ON DUPLICATE KEY UPDATE role_name=role_name;

INSERT INTO band_roles (band_id, role_name)
SELECT id, 'Guitarist' FROM bands
ON DUPLICATE KEY UPDATE role_name=role_name;

INSERT INTO band_roles (band_id, role_name)
SELECT id, 'Bassist' FROM bands
ON DUPLICATE KEY UPDATE role_name=role_name;

INSERT INTO band_roles (band_id, role_name)
SELECT id, 'Drummer' FROM bands
ON DUPLICATE KEY UPDATE role_name=role_name;

INSERT INTO band_roles (band_id, role_name)
SELECT id, 'Keyboardist' FROM bands
ON DUPLICATE KEY UPDATE role_name=role_name;

-- 3. Alter memberships table to support role_id and is_manager
ALTER TABLE memberships ADD COLUMN is_manager TINYINT(1) DEFAULT 0;
ALTER TABLE memberships ADD COLUMN role_id INT NULL;

-- 4. Migrate old memberships 'manager' status
UPDATE memberships SET is_manager = 1 WHERE role = 'manager';

-- 5. Map old text instruments to the new band_roles IDs
UPDATE memberships m
JOIN band_roles r ON m.band_id = r.band_id
SET m.role_id = r.id
WHERE (m.instrument LIKE '%guitar%' AND r.role_name = 'Guitarist')
   OR (m.instrument LIKE '%bass%' AND r.role_name = 'Bassist')
   OR (m.instrument LIKE '%drum%' AND r.role_name = 'Drummer')
   OR (m.instrument LIKE '%key%' AND r.role_name = 'Keyboardist')
   OR (m.instrument LIKE '%vocal%' AND r.role_name = 'Vocalist')
   OR (m.instrument LIKE '%sing%' AND r.role_name = 'Vocalist');

-- 6. Add foreign key constraint to role_id in memberships
ALTER TABLE memberships ADD CONSTRAINT fk_memberships_role_id FOREIGN KEY (role_id) REFERENCES band_roles(id) ON DELETE SET NULL;

-- 7. Drop obsolete columns from memberships
ALTER TABLE memberships DROP COLUMN role;
ALTER TABLE memberships DROP COLUMN instrument;

-- 8. Add performing_member_ids column to performance_songs
ALTER TABLE performance_songs ADD COLUMN performing_member_ids JSON DEFAULT NULL;
