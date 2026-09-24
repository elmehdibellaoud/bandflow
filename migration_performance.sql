-- BandFlow Phase 4 Migration: Performances & Performance Songs Tables
USE bandflow;

CREATE TABLE IF NOT EXISTS performances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  band_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  date_time DATETIME NOT NULL,
  venue VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS performance_songs (
  performance_id INT NOT NULL,
  song_id INT NOT NULL,
  sequence_order INT NOT NULL,
  PRIMARY KEY (performance_id, song_id),
  FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
) ENGINE=InnoDB;
