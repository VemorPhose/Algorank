const pool = require('../config/db');

class Problem {
  static async getAll() {
    const result = await pool.query(
      'SELECT id, problem_id, title, difficulty, solved_count FROM problems'
    );
    return result.rows;
  }

  static async getById(problemId) {
    const result = await pool.query(
      'SELECT id, problem_id, title, difficulty, solved_count FROM problems WHERE problem_id = $1',
      [problemId]
    );
    return result.rows[0];
  }

  static async incrementSolvedCount(problemId) {
    await pool.query(
      'UPDATE problems SET solved_count = solved_count + 1 WHERE problem_id = $1',
      [problemId]
    );
  }
}

module.exports = Problem;