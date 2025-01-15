const pool = require('../config/db');

// 📥 Get all problems
const getAllProblems = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM problems ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ➕ Add a new problem
const addProblem = async (req, res) => {
  const { code, name, difficulty } = req.body;
  try {
    await pool.query(
      'INSERT INTO problems (code, name, difficulty) VALUES ($1, $2, $3)',
      [code, name, difficulty]
    );
    res.status(201).json({ message: 'Problem added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllProblems,
  addProblem,
};
