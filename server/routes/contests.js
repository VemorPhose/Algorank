const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const contestsQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT cp.user_id) as participant_count
      FROM contests c
      LEFT JOIN contest_participants cp ON c.contest_id = cp.contest_id
      GROUP BY c.id, c.contest_id, c.title, c.description, c.start_time, c.end_time, c.status, c.created_at
      ORDER BY c.start_time DESC
    `;

    const { rows } = await pool.query(contestsQuery);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

module.exports = router;