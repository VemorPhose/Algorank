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

router.get('/:contestId/details', async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.query.userId || '';

    // Get contest details
    const contestQuery = `
      SELECT * FROM contests WHERE contest_id = $1
    `;
    const contestResult = await pool.query(contestQuery, [contestId]);
    
    if (contestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Get problems with solved status and solved count
    const problemsQuery = `
      SELECT 
        p.*,
        cp.points,
        CASE WHEN s.user_id IS NOT NULL THEN true ELSE false END as is_solved,
        (SELECT COUNT(*) FROM solved WHERE problem_id = p.problem_id) as solved_count
      FROM problems p
      JOIN contest_problems cp ON p.problem_id = cp.problem_id
      LEFT JOIN solved s ON p.problem_id = s.problem_id AND s.user_id = $2
      WHERE cp.contest_id = $1
      ORDER BY cp.order_index
    `;
    const problemsResult = await pool.query(problemsQuery, [contestId, userId]);

    // Calculate user's score if they're logged in
    let userScore = 0;
    if (userId) {
      const scoreQuery = `
        SELECT COALESCE(SUM(cp.points), 0) as total_score
        FROM contest_problems cp
        JOIN solved s ON cp.problem_id = s.problem_id
        WHERE cp.contest_id = $1 AND s.user_id = $2
      `;
      const scoreResult = await pool.query(scoreQuery, [contestId, userId]);
      userScore = scoreResult.rows[0].total_score;
    }

    res.json({
      contest: contestResult.rows[0],
      problems: problemsResult.rows,
      userScore
    });
  } catch (error) {
    console.error('Error fetching contest details:', error);
    res.status(500).json({ error: 'Failed to fetch contest details' });
  }
});

module.exports = router;