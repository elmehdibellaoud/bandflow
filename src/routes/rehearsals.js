import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { query, getPool } from '../config/db.js';

const router = Router();

// Protect all rehearsal endpoints with JWT auth middleware
router.use(authMiddleware);

/**
 * GET /api/rehearsals?band_id=XYZ
 * Returns all rehearsals for the active band.
 * If linked to a performance, inherits its setlist and highlights focus songs.
 * Enforces that the requesting user belongs to the band.
 */
router.get('/', async (req, res) => {
  const bandId = req.query.band_id;
  const userId = req.user.user_id;

  if (!bandId) {
    return res.status(400).json({ error: 'band_id query parameter is required.' });
  }

  try {
    // Verify membership: user must belong to the band to read events
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0) {
      return res.status(403).json({ error: 'Access denied. You do not belong to this band.' });
    }

    // Retrieve all rehearsals along with optionally linked performance title
    const [rehearsals] = await query(
      `SELECT r.*, p.title as performance_title 
       FROM rehearsals r 
       LEFT JOIN performances p ON r.performance_id = p.id 
       WHERE r.band_id = ? 
       ORDER BY r.date_time ASC`,
      [bandId]
    );

    // Build complete details for each rehearsal
    const responseList = [];
    for (const reh of rehearsals) {
      let songs = [];
      
      if (reh.performance_id) {
        // Inherited setlist from performance, with focus song mapping flags
        const [inheritedSongs] = await query(
          `SELECT s.id, s.title, s.song_key, s.tempo, s.duration, ps.sequence_order,
                  IF(rfs.song_id IS NOT NULL, 1, 0) as is_focus
           FROM performance_songs ps
           JOIN songs s ON ps.song_id = s.id
           LEFT JOIN rehearsal_focus_songs rfs ON rfs.rehearsal_id = ? AND rfs.song_id = s.id
           WHERE ps.performance_id = ?
           ORDER BY ps.sequence_order ASC`,
          [reh.id, reh.performance_id]
        );
        songs = inheritedSongs;
      } else {
        // Not linked to a show: fetch focus songs directly
        const [directFocusSongs] = await query(
          `SELECT s.id, s.title, s.song_key, s.tempo, s.duration,
                  1 as is_focus
           FROM rehearsal_focus_songs rfs
           JOIN songs s ON rfs.song_id = s.id
           WHERE rfs.rehearsal_id = ?`,
          [reh.id]
        );
        // Map fake sequence order for listing uniformity
        songs = directFocusSongs.map((song, index) => ({
          ...song,
          sequence_order: index + 1
        }));
      }

      responseList.push({
        id: reh.id,
        band_id: reh.band_id,
        performance_id: reh.performance_id,
        performance_title: reh.performance_title,
        date_time: reh.date_time,
        location: reh.location,
        created_at: reh.created_at,
        songs
      });
    }

    return res.status(200).json({ rehearsals: responseList });
  } catch (error) {
    console.error('Error fetching rehearsals:', error);
    return res.status(500).json({ error: 'Internal server error while fetching rehearsals.' });
  }
});

/**
 * POST /api/rehearsals
 * Creates a rehearsal session and binds the chosen focus songs.
 * Runs in a database transaction. Managers only.
 */
router.post('/', async (req, res) => {
  const { band_id, performance_id, date_time, location, focus_song_ids } = req.body;
  const userId = req.user.user_id;

  if (!band_id) {
    return res.status(400).json({ error: 'band_id is required.' });
  }
  if (!date_time) {
    return res.status(400).json({ error: 'Rehearsal date and time are required.' });
  }
  if (!location || location.trim() === '') {
    return res.status(400).json({ error: 'Rehearsal location is required.' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // Verify Manager rights
    const [memberships] = await connection.query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, band_id]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can schedule rehearsals.' });
    }

    // Start transaction
    await connection.beginTransaction();

    // 1. Insert rehearsal details
    const [rehResult] = await connection.query(
      'INSERT INTO rehearsals (band_id, performance_id, date_time, location) VALUES (?, ?, ?, ?)',
      [band_id, performance_id || null, date_time, location.trim()]
    );
    const rehearsalId = rehResult.insertId;

    // 2. Insert focus song details
    if (focus_song_ids && Array.isArray(focus_song_ids) && focus_song_ids.length > 0) {
      for (const songId of focus_song_ids) {
        await connection.query(
          'INSERT INTO rehearsal_focus_songs (rehearsal_id, song_id) VALUES (?, ?)',
          [rehearsalId, songId]
        );
      }
    }

    // Commit changes
    await connection.commit();

    return res.status(201).json({
      message: 'Rehearsal scheduled successfully.',
      rehearsal: {
        id: rehearsalId,
        band_id,
        performance_id: performance_id || null,
        date_time,
        location: location.trim(),
        focus_song_ids: focus_song_ids || []
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating rehearsal:', error);
    return res.status(500).json({ error: 'Internal server error while scheduling rehearsal.' });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/rehearsals/:id
 * Updates rehearsal session info and focus songs choices.
 * Runs in a database transaction. Managers only.
 */
router.put('/:id', async (req, res) => {
  const rehearsalId = req.params.id;
  const { performance_id, date_time, location, focus_song_ids } = req.body;
  const userId = req.user.user_id;

  if (!date_time) {
    return res.status(400).json({ error: 'Rehearsal date and time are required.' });
  }
  if (!location || location.trim() === '') {
    return res.status(400).json({ error: 'Rehearsal location is required.' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // 1. Resolve band context
    const [rehs] = await connection.query('SELECT band_id FROM rehearsals WHERE id = ?', [rehearsalId]);
    if (rehs.length === 0) {
      return res.status(404).json({ error: 'Rehearsal not found.' });
    }

    const bandId = rehs[0].band_id;

    // 2. Verify Manager permissions
    const [memberships] = await connection.query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can update rehearsals.' });
    }

    // Start transaction
    await connection.beginTransaction();

    // 3. Update rehearsal info
    await connection.query(
      'UPDATE rehearsals SET performance_id = ?, date_time = ?, location = ? WHERE id = ?',
      [performance_id || null, date_time, location.trim(), rehearsalId]
    );

    // 4. Overwrite focus song lists if provided
    if (focus_song_ids && Array.isArray(focus_song_ids)) {
      // Clear current focus songs
      await connection.query('DELETE FROM rehearsal_focus_songs WHERE rehearsal_id = ?', [rehearsalId]);
      
      // Save new focus songs
      for (const songId of focus_song_ids) {
        await connection.query(
          'INSERT INTO rehearsal_focus_songs (rehearsal_id, song_id) VALUES (?, ?)',
          [rehearsalId, songId]
        );
      }
    }

    // Commit changes
    await connection.commit();

    return res.status(200).json({
      message: 'Rehearsal updated successfully.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating rehearsal:', error);
    return res.status(500).json({ error: 'Internal server error while updating rehearsal.' });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/rehearsals/:id
 * Removes a rehearsal session.
 * Managers only.
 */
router.delete('/:id', async (req, res) => {
  const rehearsalId = req.params.id;
  const userId = req.user.user_id;

  try {
    // 1. Resolve band context
    const [rehs] = await query('SELECT band_id FROM rehearsals WHERE id = ?', [rehearsalId]);
    if (rehs.length === 0) {
      return res.status(404).json({ error: 'Rehearsal not found.' });
    }

    const bandId = rehs[0].band_id;

    // 2. Verify Manager permissions
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can delete rehearsals.' });
    }

    // 3. Delete rehearsal (Cascade FK delete clears child links in rehearsal_focus_songs)
    await query('DELETE FROM rehearsals WHERE id = ?', [rehearsalId]);

    return res.status(200).json({
      message: 'Rehearsal deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting rehearsal:', error);
    return res.status(500).json({ error: 'Internal server error while deleting rehearsal.' });
  }
});

export default router;
