-- BandFlow Database Schema Setup
CREATE DATABASE IF NOT EXISTS bandflow;
USE bandflow;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create bands table
CREATE TABLE IF NOT EXISTS bands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unique_band_id VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create band_roles table
CREATE TABLE IF NOT EXISTS band_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  band_id INT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
  UNIQUE KEY idx_band_role (band_id, role_name)
) ENGINE=InnoDB;

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  user_id INT NOT NULL,
  band_id INT NOT NULL,
  role_id INT DEFAULT NULL,
  is_manager TINYINT(1) DEFAULT 0,
  PRIMARY KEY (user_id, band_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES band_roles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Create songs table
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

-- Create performances table
CREATE TABLE IF NOT EXISTS performances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  band_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  date_time DATETIME NOT NULL,
  venue VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create performance_songs table
CREATE TABLE IF NOT EXISTS performance_songs (
  performance_id INT NOT NULL,
  song_id INT NOT NULL,
  sequence_order INT NOT NULL,
  performing_member_ids JSON DEFAULT NULL,
  PRIMARY KEY (performance_id, song_id),
  FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create rehearsals table
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

-- Create rehearsal_focus_songs table
CREATE TABLE IF NOT EXISTS rehearsal_focus_songs (
  rehearsal_id INT NOT NULL,
  song_id INT NOT NULL,
  PRIMARY KEY (rehearsal_id, song_id),
  FOREIGN KEY (rehearsal_id) REFERENCES rehearsals(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
) ENGINE=InnoDB;
