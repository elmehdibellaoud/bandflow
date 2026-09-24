import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { query } from '../config/db.js';

const router = Router();

// Protect all song endpoints with our JWT auth middleware
router.use(authMiddleware);

/**
 * GET /api/songs?band_id=XYZ
 * Returns all songs belonging to that specific band.
 * Enforces that the requesting user belongs to the band.
 */
router.get('/', async (req, res) => {
  const bandId = req.query.band_id;
  const userId = req.user.user_id;

  if (!bandId) {
    return res.status(400).json({ error: 'band_id query parameter is required.' });
  }

  try {
    // Verify membership: user must belong to the band to read songs
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0) {
      return res.status(403).json({ error: 'Access denied. You do not belong to this band.' });
    }

    // Retrieve songs sorted alphabetically by title
    const [songs] = await query(
      'SELECT * FROM songs WHERE band_id = ? ORDER BY title ASC',
      [bandId]
    );

    return res.status(200).json({ songs });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return res.status(500).json({ error: 'Internal server error while fetching songs.' });
  }
});

/**
 * POST /api/songs
 * Adds a new song to a band.
 * Enforces that the user is a manager in the band.
 */
router.post('/', async (req, res) => {
  const { band_id, title, song_key, tempo, duration, reference_link } = req.body;
  const userId = req.user.user_id;

  if (!band_id) {
    return res.status(400).json({ error: 'band_id is required.' });
  }
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Song title is required.' });
  }

  try {
    // Verify manager role
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, band_id]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can add songs.' });
    }

    // Validate Spotify or YouTube links if provided
    if (reference_link) {
      const trimmedLink = reference_link.trim();
      const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com\/|spotify:)/i;
      const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i;
      
      if (!spotifyRegex.test(trimmedLink) && !youtubeRegex.test(trimmedLink)) {
        return res.status(400).json({ error: 'Only Spotify and YouTube links are allowed.' });
      }
    }

    // Insert song record (duration is removed and defaulted to null)
    const [result] = await query(
      `INSERT INTO songs (band_id, title, song_key, tempo, duration, reference_link) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        band_id,
        title.trim(),
        song_key ? song_key.trim() : null,
        tempo ? parseInt(tempo, 10) : null,
        null,
        reference_link ? reference_link.trim() : null
      ]
    );

    const newSongId = result.insertId;

    // Fetch and return the newly created song
    const [songs] = await query('SELECT * FROM songs WHERE id = ?', [newSongId]);

    return res.status(201).json({
      message: 'Song added successfully.',
      song: songs[0]
    });
  } catch (error) {
    console.error('Error creating song:', error);
    return res.status(500).json({ error: 'Internal server error while adding song.' });
  }
});

/**
 * PUT /api/songs/:id
 * Updates details of an existing song.
 * Enforces that the user is a manager in the band.
 */
router.put('/:id', async (req, res) => {
  const songId = req.params.id;
  const { title, song_key, tempo, reference_link } = req.body;
  const userId = req.user.user_id;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Song title is required.' });
  }

  try {
    // 1. Retrieve the song to determine its band scope
    const [songs] = await query('SELECT band_id FROM songs WHERE id = ?', [songId]);
    if (songs.length === 0) {
      return res.status(404).json({ error: 'Song not found.' });
    }

    const bandId = songs[0].band_id;

    // 2. Verify manager status
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can update songs.' });
    }

    // Validate Spotify or YouTube links if provided
    if (reference_link) {
      const trimmedLink = reference_link.trim();
      const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com\/|spotify:)/i;
      const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i;
      
      if (!spotifyRegex.test(trimmedLink) && !youtubeRegex.test(trimmedLink)) {
        return res.status(400).json({ error: 'Only Spotify and YouTube links are allowed.' });
      }
    }

    // 3. Update the song
    await query(
      `UPDATE songs 
       SET title = ?, song_key = ?, tempo = ?, duration = ?, reference_link = ? 
       WHERE id = ?`,
      [
        title.trim(),
        song_key ? song_key.trim() : null,
        tempo ? parseInt(tempo, 10) : null,
        null,
        reference_link ? reference_link.trim() : null,
        songId
      ]
    );

    // Fetch and return the updated record
    const [updatedSongs] = await query('SELECT * FROM songs WHERE id = ?', [songId]);

    return res.status(200).json({
      message: 'Song updated successfully.',
      song: updatedSongs[0]
    });
  } catch (error) {
    console.error('Error updating song:', error);
    return res.status(500).json({ error: 'Internal server error while updating song.' });
  }
});

/**
 * DELETE /api/songs/:id
 * Removes a song from the repertoire.
 * Enforces that the user is a manager in the band.
 */
router.delete('/:id', async (req, res) => {
  const songId = req.params.id;
  const userId = req.user.user_id;

  try {
    // 1. Check if song exists and resolve band scope
    const [songs] = await query('SELECT band_id FROM songs WHERE id = ?', [songId]);
    if (songs.length === 0) {
      return res.status(404).json({ error: 'Song not found.' });
    }

    const bandId = songs[0].band_id;

    // 2. Verify manager status
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can delete songs.' });
    }

    // 3. Delete record
    await query('DELETE FROM songs WHERE id = ?', [songId]);

    return res.status(200).json({
      message: 'Song deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting song:', error);
    return res.status(500).json({ error: 'Internal server error while deleting song.' });
  }
});

export default router;
