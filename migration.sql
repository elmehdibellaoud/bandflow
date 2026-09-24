-- BandFlow Phase 3 Migration: Songs Table
USE bandflow;

CREATE TABLE IF NOT EXISTS songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  band_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  song_key VARCHAR(50) DEFAULT NULL,
  tempo INT DEFAULT NULL,
  duration INT DEFAULT NULL,
  reference_link VARCHAR(1024) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
  INDEX idx_band_id (band_id)
) ENGINE=InnoDB;
