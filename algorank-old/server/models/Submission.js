const pool = require('../config/db');

class Submission {
  static async create(submissionData) {
    const { submissionId, problemId, userId, code, language, contestId } = submissionData;
    await pool.query(
      'INSERT INTO submissions (submission_id, problem_id, user_id, code, language, contest_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [submissionId, problemId, userId, code, language, contestId]
    );
  }

  static async updateStatus(submissionId, status) {
    await pool.query(
      'UPDATE submissions SET status = $1 WHERE submission_id = $2',
      [status, submissionId]
    );
  }

  static async saveTestResult(submissionId, testNumber, status, time, memory) {
    await pool.query(
      'INSERT INTO test_case_results (submission_id, test_case_number, status, execution_time, memory_usage) VALUES ($1, $2, $3, $4, $5)',
      [submissionId, testNumber, status, time, memory]
    );
  }
}

module.exports = Submission;