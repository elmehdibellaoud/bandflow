-- BandFlow Phase 5 Migration: Rehearsals & Rehearsal Focus Songs Tables
USE bandflow;

CREATE TABLE IF NOT EXISTS rehearsals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  band_id INT NOT NULL,
  performance_id INT DEFAULT NULL,
  date_time DATETIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rehearsal_focus_songs (
  rehearsal_id INT NOT NULL,
  song_id INT NOT NULL,
  PRIMARY KEY (rehearsal_id, song_id),
  FOREIGN KEY (rehearsal_id) REFERENCES rehearsals(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
) ENGINE=InnoDB;
