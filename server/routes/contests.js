const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    const contestsQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT cp.user_id) as participant_count,
        EXISTS(
          SELECT 1 
          FROM contest_participants 
          WHERE contest_id = c.contest_id 
          AND user_id = $1
        ) as is_registered
      FROM contests c
      LEFT JOIN contest_participants cp ON c.contest_id = cp.contest_id
      GROUP BY c.contest_id, c.title, c.description, c.start_time, c.end_time, c.status, c.created_at
      ORDER BY c.start_time DESC
    `;

    const { rows } = await pool.query(contestsQuery, [userId || '']);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

router.post('/:contestId/register', async (req, res) => {
  try {
    const { contestId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user is already registered
    const existingRegistration = await pool.query(
      'SELECT 1 FROM contest_participants WHERE contest_id = $1 AND user_id = $2',
      [contestId, userId]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this contest' });
    }

    // Register user
    await pool.query(
      'INSERT INTO contest_participants (contest_id, user_id) VALUES ($1, $2)',
      [contestId, userId]
    );

    // Increment participants count
    await pool.query(
      'UPDATE contests SET participants = participants + 1 WHERE contest_id = $1',
      [contestId]
    );

    res.json({ message: 'Successfully registered for contest' });
  } catch (error) {
    console.error('Error registering for contest:', error);
    res.status(500).json({ error: 'Failed to register for contest' });
  }
});

module.exports = router;