const express = require('express');
const router = express.Router();
const Problem = require('../models/problem');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');


router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const problems = await pool.query(`
      SELECT p.*, 
             CASE WHEN s.user_id IS NOT NULL THEN true ELSE false END as is_solved
      FROM problems p
      LEFT JOIN solved s ON p.problem_id = s.problem_id AND s.user_id = $1`,
      [userId || '']
    );
    res.json(problems.rows);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

router.get('/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    const problem = await Problem.getById(problemId);
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const descriptionPath = path.join(
      __dirname, 
      '..', 
      '..', 
      'algorank-problems',
      'problems',
      problemId,
      'description.md'
    );
    
    const description = await fs.readFile(descriptionPath, 'utf8');

    res.json({
      ...problem,
      description
    });
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ error: 'Failed to fetch problem details' });
  }
});

module.exports = router;