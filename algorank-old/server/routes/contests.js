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
    const userId = req.query.userId;

    // Get contest details
    const contestQuery = `
      SELECT * FROM contests WHERE contest_id = $1
    `;
    const contestResult = await pool.query(contestQuery, [contestId]);
    
    if (contestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Get problems with solved status - only count submissions made during the contest
    const problemsQuery = `
      SELECT 
        p.*,
        cp.points,
        CASE WHEN s.user_id IS NOT NULL THEN true ELSE false END as is_solved,
        (SELECT COUNT(*) FROM submissions 
         WHERE problem_id = p.problem_id 
         AND status = true 
         AND contest_id = $1) as solved_count
      FROM problems p
      JOIN contest_problems cp ON p.problem_id = cp.problem_id
      LEFT JOIN submissions s ON p.problem_id = s.problem_id 
        AND s.user_id = $2 
        AND s.contest_id = $1 
        AND s.status = true
      WHERE cp.contest_id = $1
      ORDER BY cp.order_index
    `;
    const problemsResult = await pool.query(problemsQuery, [contestId, userId || '']);

    // Calculate user's contest score
    let userScore = 0;
    if (userId) {
      const scoreQuery = `
        SELECT COALESCE(SUM(cp.points), 0) as total_score
        FROM contest_problems cp
        JOIN submissions s ON cp.problem_id = s.problem_id
        WHERE cp.contest_id = $1 
        AND s.user_id = $2 
        AND s.contest_id = $1
        AND s.status = true
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

router.get('/:contestId/standings', async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.query.userId;

    // First get contest details with problems
    const contestQuery = `
      SELECT 
        c.*,
        json_agg(
          json_build_object(
            'problem_id', p.problem_id,
            'title', p.title,
            'points', cp.points
          ) ORDER BY cp.order_index
        ) as problems
      FROM contests c
      JOIN contest_problems cp ON c.contest_id = cp.contest_id
      JOIN problems p ON cp.problem_id = p.problem_id
      WHERE c.contest_id = $1
      GROUP BY c.contest_id
    `;

    const contestResult = await pool.query(contestQuery, [contestId]);
    
    if (contestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Get participants' standings with problem-wise scores
    const standingsQuery = `
      WITH problem_scores AS (
        SELECT 
          s.user_id,
          s.problem_id,
          cp.points as score,
          s.status
        FROM submissions s
        JOIN contest_problems cp ON s.problem_id = cp.problem_id 
          AND cp.contest_id = s.contest_id
        WHERE s.contest_id = $1
        GROUP BY s.user_id, s.problem_id, cp.points, s.status
      )
      SELECT 
        cp.user_id,
        u.username,
        COALESCE(SUM(CASE WHEN ps.status THEN ps.score ELSE 0 END), 0) as total_score,
        jsonb_object_agg(
          COALESCE(ps.problem_id, 'none'),
          jsonb_build_object(
            'points', CASE WHEN ps.status THEN ps.score ELSE 0 END,
            'attempted', CASE WHEN ps.problem_id IS NOT NULL THEN true ELSE false END
          )
        ) as problem_scores
      FROM contest_participants cp
      JOIN users u ON cp.user_id = u.user_id
      LEFT JOIN problem_scores ps ON u.user_id = ps.user_id
      WHERE cp.contest_id = $1
      GROUP BY cp.user_id, u.username
      ORDER BY total_score DESC, u.username
    `;

    const standingsResult = await pool.query(standingsQuery, [contestId]);

    res.json({
      contest: contestResult.rows[0],
      standings: standingsResult.rows
    });

  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

module.exports = router;