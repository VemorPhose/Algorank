const express = require('express');
const router = express.Router();
const { getAllProblems, addProblem } = require('../controllers/problemController');

// 📝 Get all problems
router.get('/', getAllProblems);

// ➕ Add a new problem
router.post('/', addProblem);

module.exports = router;
