import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { query, getPool } from '../config/db.js';

const router = Router();

// Protect all performance endpoints with JWT auth middleware
router.use(authMiddleware);

/**
 * GET /api/performances?band_id=XYZ
 * Returns all performances for the active band, including their complete setlists ordered by sequence_order
 * and the roster list of users assigned to play each track.
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

    // Retrieve all performances and their joined setlist songs & roster members
    const [rows] = await query(
      `SELECT p.id as performance_id, p.title as performance_title, p.date_time, p.venue, p.created_at,
              ps.song_id, ps.sequence_order, ps.performing_member_ids,
              s.title as song_title, s.song_key, s.tempo, s.duration
       FROM performances p
       LEFT JOIN performance_songs ps ON p.id = ps.performance_id
       LEFT JOIN songs s ON ps.song_id = s.id
       WHERE p.band_id = ?
       ORDER BY p.date_time ASC, ps.sequence_order ASC`,
      [bandId]
    );

    // Group the joined rows into performance objects with an array of songs
    const performanceMap = {};
    for (const row of rows) {
      if (!performanceMap[row.performance_id]) {
        performanceMap[row.performance_id] = {
          id: row.performance_id,
          title: row.performance_title,
          date_time: row.date_time,
          venue: row.venue,
          created_at: row.created_at,
          songs: []
        };
      }
      if (row.song_id) {
        let performing_members = [];
        try {
          performing_members = typeof row.performing_member_ids === 'string'
            ? JSON.parse(row.performing_member_ids)
            : (row.performing_member_ids || []);
        } catch (e) {
          console.error('Error parsing performing_member_ids:', e);
        }

        performanceMap[row.performance_id].songs.push({
          id: row.song_id,
          title: row.song_title,
          song_key: row.song_key,
          tempo: row.tempo,
          duration: row.duration,
          sequence_order: row.sequence_order,
          performing_members
        });
      }
    }

    const performances = Object.values(performanceMap);
    return res.status(200).json({ performances });
  } catch (error) {
    console.error('Error fetching performances:', error);
    return res.status(500).json({ error: 'Internal server error while fetching performances.' });
  }
});

/**
 * POST /api/performances
 * Creates a performance and sets up its ordered setlist and musician roster assignments.
 * Restricted to Managers only. Runs in a SQL transaction.
 */
router.post('/', async (req, res) => {
  const { title, date_time, venue, band_id, songs } = req.body;
  const userId = req.user.user_id;

  if (!band_id) {
    return res.status(400).json({ error: 'band_id is required.' });
  }
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Performance title is required.' });
  }
  if (!date_time) {
    return res.status(400).json({ error: 'Performance date and time are required.' });
  }
  if (!venue || venue.trim() === '') {
    return res.status(400).json({ error: 'Performance venue is required.' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // Verify Manager privileges
    const [memberships] = await connection.query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, band_id]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can schedule performances.' });
    }

    // Start database transaction
    await connection.beginTransaction();

    // 1. Insert performance details
    const [perfResult] = await connection.query(
      'INSERT INTO performances (band_id, title, date_time, venue) VALUES (?, ?, ?, ?)',
      [band_id, title.trim(), date_time, venue.trim()]
    );
    const performanceId = perfResult.insertId;

    // 2. Insert setlist song order mappings and assigned rosters
    if (songs && Array.isArray(songs) && songs.length > 0) {
      for (let i = 0; i < songs.length; i++) {
        const songItem = songs[i];
        
        // songItem can be an object { id, performing_members: [...] } or just a song ID
        const songId = typeof songItem === 'object' ? songItem.id : songItem;
        const performingMembers = typeof songItem === 'object' ? (songItem.performing_members || []) : [];

        await connection.query(
          'INSERT INTO performance_songs (performance_id, song_id, sequence_order, performing_member_ids) VALUES (?, ?, ?, ?)',
          [performanceId, songId, i + 1, JSON.stringify(performingMembers)]
        );
      }
    }

    // Commit changes
    await connection.commit();

    return res.status(201).json({
      message: 'Performance created successfully.',
      performance: {
        id: performanceId,
        band_id,
        title: title.trim(),
        date_time,
        venue: venue.trim(),
        songs: songs || []
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating performance:', error);
    return res.status(500).json({ error: 'Internal server error while creating performance.' });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/performances/:id
 * Updates performance info and swaps/reorders the associated setlist array and rosters.
 * Restricted to Managers only. Runs in a SQL transaction.
 */
router.put('/:id', async (req, res) => {
  const performanceId = req.params.id;
  const { title, date_time, venue, songs } = req.body;
  const userId = req.user.user_id;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Performance title is required.' });
  }
  if (!date_time) {
    return res.status(400).json({ error: 'Performance date and time are required.' });
  }
  if (!venue || venue.trim() === '') {
    return res.status(400).json({ error: 'Performance venue is required.' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // 1. Retrieve performance to determine band context
    const [perfs] = await connection.query('SELECT band_id FROM performances WHERE id = ?', [performanceId]);
    if (perfs.length === 0) {
      return res.status(404).json({ error: 'Performance not found.' });
    }

    const bandId = perfs[0].band_id;

    // 2. Verify Manager permissions
    const [memberships] = await connection.query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can update performances.' });
    }

    // Start database transaction
    await connection.beginTransaction();

    // 3. Update performance metadata
    await connection.query(
      'UPDATE performances SET title = ?, date_time = ?, venue = ? WHERE id = ?',
      [title.trim(), date_time, venue.trim(), performanceId]
    );

    // 4. Overwrite setlist associations & performing members if songs array is supplied
    if (songs && Array.isArray(songs)) {
      // Clear current associations
      await connection.query('DELETE FROM performance_songs WHERE performance_id = ?', [performanceId]);
      
      // Write new associations with sequence orders and member assignments
      for (let i = 0; i < songs.length; i++) {
        const songItem = songs[i];
        const songId = typeof songItem === 'object' ? songItem.id : songItem;
        const performingMembers = typeof songItem === 'object' ? (songItem.performing_members || []) : [];

        await connection.query(
          'INSERT INTO performance_songs (performance_id, song_id, sequence_order, performing_member_ids) VALUES (?, ?, ?, ?)',
          [performanceId, songId, i + 1, JSON.stringify(performingMembers)]
        );
      }
    }

    // Commit changes
    await connection.commit();

    return res.status(200).json({
      message: 'Performance updated successfully.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating performance:', error);
    return res.status(500).json({ error: 'Internal server error while updating performance.' });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/performances/:id
 * Removes a performance.
 * Restricted to Managers only.
 */
router.delete('/:id', async (req, res) => {
  const performanceId = req.params.id;
  const userId = req.user.user_id;

  try {
    // 1. Resolve band context
    const [perfs] = await query('SELECT band_id FROM performances WHERE id = ?', [performanceId]);
    if (perfs.length === 0) {
      return res.status(404).json({ error: 'Performance not found.' });
    }

    const bandId = perfs[0].band_id;

    // 2. Verify Manager permissions
    const [memberships] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (memberships.length === 0 || memberships[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Only managers can delete performances.' });
    }

    // 3. Delete performance (Cascade FK deletes child mappings in performance_songs)
    await query('DELETE FROM performances WHERE id = ?', [performanceId]);

    return res.status(200).json({
      message: 'Performance deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting performance:', error);
    return res.status(500).json({ error: 'Internal server error while deleting performance.' });
  }
});

export default router;
