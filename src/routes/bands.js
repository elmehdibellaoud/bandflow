import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { query, getPool } from '../config/db.js';

const router = Router();

// Protect all band endpoints with the authentication middleware
router.use(authMiddleware);

/**
 * Generates a unique, uppercase, alphanumeric band ID matching the pattern "ABCD-1234".
 * Verifies with the DB to guarantee uniqueness.
 */
async function generateUniqueBandId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  for (let attempt = 0; attempt < 10; attempt++) {
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) {
      part1 += letters.charAt(Math.floor(Math.random() * letters.length));
      part2 += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    const candidateId = `${part1}-${part2}`;
    
    const [existing] = await query('SELECT id FROM bands WHERE unique_band_id = ?', [candidateId]);
    if (existing.length === 0) {
      return candidateId;
    }
  }
  throw new Error('Failed to generate a unique band ID after 10 attempts.');
}

/**
 * GET /api/bands/verify/:unique_band_id
 * Verifies a band ID is valid, and returns the band name and its custom roles list.
 * Required for dynamically loading roles in the Join Band dropdown.
 */
router.get('/verify/:unique_band_id', async (req, res) => {
  const { unique_band_id } = req.params;

  try {
    const [bands] = await query('SELECT id, name FROM bands WHERE unique_band_id = ?', [unique_band_id.trim()]);
    if (bands.length === 0) {
      return res.status(404).json({ error: 'Band not found with this ID.' });
    }

    const band = bands[0];
    const [roles] = await query('SELECT id, role_name FROM band_roles WHERE band_id = ? ORDER BY role_name ASC', [band.id]);

    return res.status(200).json({
      valid: true,
      band: {
        id: band.id,
        name: band.name,
        roles
      }
    });
  } catch (error) {
    console.error('Error verifying band:', error);
    return res.status(500).json({ error: 'Internal server error while verifying band.' });
  }
});

/**
 * POST /api/bands/create
 * Creates a new band, seeds default band roles, and assigns creator as manager.
 * Handled within a SQL transaction.
 */
router.post('/create', async (req, res) => {
  const { name } = req.body;
  const userId = req.user.user_id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Band name is required.' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const uniqueBandId = await generateUniqueBandId();

    // Start transaction
    await connection.beginTransaction();

    // 1. Insert the new band
    const [bandResult] = await connection.query(
      'INSERT INTO bands (name, unique_band_id) VALUES (?, ?)',
      [name.trim(), uniqueBandId]
    );
    const bandId = bandResult.insertId;

    // 2. Seed standard band roles
    const defaultRoles = ['Vocalist', 'Guitarist', 'Bassist', 'Drummer', 'Keyboardist'];
    for (const role of defaultRoles) {
      await connection.query(
        'INSERT INTO band_roles (band_id, role_name) VALUES (?, ?)',
        [bandId, role]
      );
    }

    // 3. Automatically assign the creator to memberships as manager (no custom musical role linked by default)
    await connection.query(
      'INSERT INTO memberships (user_id, band_id, role_id, is_manager) VALUES (?, ?, NULL, 1)',
      [userId, bandId]
    );

    // Commit transaction
    await connection.commit();

    return res.status(201).json({
      message: 'Band created successfully.',
      band: {
        id: bandId,
        name: name.trim(),
        unique_band_id: uniqueBandId,
        role: 'manager'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating band:', error);
    return res.status(500).json({ error: 'Internal server error while creating band.' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/bands/join
 * Joins a band using unique_band_id and binds user to a dynamic role_id.
 */
router.post('/join', async (req, res) => {
  const { unique_band_id, role_id } = req.body;
  const userId = req.user.user_id;

  if (!unique_band_id || unique_band_id.trim() === '') {
    return res.status(400).json({ error: 'unique_band_id is required.' });
  }

  if (!role_id) {
    return res.status(400).json({ error: 'role_id is required.' });
  }

  try {
    // 1. Retrieve the band
    const [bands] = await query('SELECT id, name FROM bands WHERE unique_band_id = ?', [unique_band_id.trim()]);
    if (bands.length === 0) {
      return res.status(404).json({ error: 'Band not found.' });
    }

    const bandId = bands[0].id;

    // 2. Verify selected role exists and belongs to this band
    const [roles] = await query('SELECT role_name FROM band_roles WHERE id = ? AND band_id = ?', [role_id, bandId]);
    if (roles.length === 0) {
      return res.status(400).json({ error: 'Selected role is invalid for this band.' });
    }

    // 3. Attempt to register the user membership as member
    try {
      await query(
        'INSERT INTO memberships (user_id, band_id, role_id, is_manager) VALUES (?, ?, ?, 0)',
        [userId, bandId, role_id]
      );
    } catch (dbError) {
      if (dbError.code === 'ER_DUP_ENTRY' || dbError.errno === 1062) {
        return res.status(400).json({ error: 'You are already a member or manager of this band.' });
      }
      throw dbError;
    }

    return res.status(200).json({
      message: 'Successfully joined the band.',
      band: {
        id: bandId,
        name: bands[0].name,
        unique_band_id: unique_band_id.trim(),
        role: 'member',
        instrument: roles[0].role_name
      }
    });
  } catch (error) {
    console.error('Error joining band:', error);
    return res.status(500).json({ error: 'Internal server error while joining band.' });
  }
});

/**
 * GET /api/bands/my-bands
 * Returns the list of bands the user belongs to.
 */
router.get('/my-bands', async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [bands] = await query(
      `SELECT b.id, b.name, b.unique_band_id, m.is_manager, r.role_name, b.created_at 
       FROM bands b 
       JOIN memberships m ON b.id = m.band_id 
       LEFT JOIN band_roles r ON m.role_id = r.id
       WHERE m.user_id = ?`,
      [userId]
    );

    // Map columns to match what frontend expects
    const mappedBands = bands.map(b => ({
      id: b.id,
      name: b.name,
      unique_band_id: b.unique_band_id,
      role: b.is_manager === 1 ? 'manager' : 'member',
      instrument: b.role_name || (b.is_manager === 1 ? 'Manager' : 'Musician'),
      created_at: b.created_at
    }));

    return res.status(200).json({ bands: mappedBands });
  } catch (error) {
    console.error('Error fetching my bands:', error);
    return res.status(500).json({ error: 'Internal server error while fetching bands.' });
  }
});

/**
 * GET /api/bands/:id/members
 * Returns the list of musicians belonging to the band.
 */
router.get('/:id/members', async (req, res) => {
  const bandId = req.params.id;
  const userId = req.user.user_id;

  try {
    // Verify membership
    const [membership] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied. You do not belong to this band.' });
    }

    const [members] = await query(
      `SELECT m.user_id, u.full_name, 
              IF(m.is_manager = 1, 'manager', 'member') as role, 
              r.role_name as instrument
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN band_roles r ON m.role_id = r.id
       WHERE m.band_id = ?`,
      [bandId]
    );

    return res.status(200).json({ members });
  } catch (error) {
    console.error('Error fetching band members:', error);
    return res.status(500).json({ error: 'Internal server error while fetching band members.' });
  }
});

/**
 * GET /api/bands/:id/roles
 * Retrieve all roles for a band.
 */
router.get('/:id/roles', async (req, res) => {
  const bandId = req.params.id;
  const userId = req.user.user_id;

  try {
    const [membership] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied. You do not belong to this band.' });
    }

    const [roles] = await query('SELECT id, role_name FROM band_roles WHERE band_id = ? ORDER BY role_name ASC', [bandId]);
    return res.status(200).json({ roles });
  } catch (error) {
    console.error('Error fetching band roles:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/bands/:id/roles
 * Adds a custom role to the band. (Manager Only)
 */
router.post('/:id/roles', async (req, res) => {
  const bandId = req.params.id;
  const { role_name } = req.body;
  const userId = req.user.user_id;

  if (!role_name || role_name.trim() === '') {
    return res.status(400).json({ error: 'role_name is required.' });
  }

  try {
    const [membership] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (membership.length === 0 || membership[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Managers only.' });
    }

    try {
      const [result] = await query(
        'INSERT INTO band_roles (band_id, role_name) VALUES (?, ?)',
        [bandId, role_name.trim()]
      );

      return res.status(201).json({
        message: 'Role added successfully.',
        role: {
          id: result.insertId,
          band_id: bandId,
          role_name: role_name.trim()
        }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        return res.status(400).json({ error: 'This role already exists in this band.' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error adding band role:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/bands/:id/roles/:role_id
 * Deletes a custom role from the band. (Manager Only)
 */
router.delete('/:id/roles/:role_id', async (req, res) => {
  const { id: bandId, role_id } = req.params;
  const userId = req.user.user_id;

  try {
    const [membership] = await query(
      'SELECT is_manager FROM memberships WHERE user_id = ? AND band_id = ?',
      [userId, bandId]
    );

    if (membership.length === 0 || membership[0].is_manager !== 1) {
      return res.status(403).json({ error: 'Access denied. Managers only.' });
    }

    await query('DELETE FROM band_roles WHERE id = ? AND band_id = ?', [role_id, bandId]);

    return res.status(200).json({ message: 'Role deleted successfully.' });
  } catch (error) {
    console.error('Error deleting band role:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
