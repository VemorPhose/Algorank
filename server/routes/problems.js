const express = require('express');
const router = express.Router();
const Problem = require('../models/problem');
const fs = require('fs').promises;
const path = require('path');

router.get('/', async (req, res) => {
  try {
    const problems = await Problem.getAll();
    res.json(problems);
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

    const descriptionPath = path.join(__dirname, '..', 'problems', problemId, 'description.md');
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