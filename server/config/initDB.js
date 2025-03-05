const pool = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function readProblemMetadata() {
  const problemsDir = path.join(
    __dirname,
    '..',
    '..',
    'algorank-problems',
    'problems'
  );
  const problemFolders = await fs.readdir(problemsDir);
  const problems = [];

  for (const folder of problemFolders) {
    if ((await fs.stat(path.join(problemsDir, folder))).isDirectory()) {
      const metadataPath = path.join(problemsDir, folder, 'metadata.json');
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        problems.push({
          problemId: metadata.id,
          title: metadata.title,
          difficulty: metadata.difficulty,
          hidden: metadata.hidden || false
        });
      } catch (error) {
        console.error(`Error reading metadata for problem ${folder}:`, error);
      }
    }
  }
  return problems;
}

async function initDB() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        problem_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        difficulty VARCHAR(20),
        solved_count INTEGER DEFAULT 0,
        hidden BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS submissions (
        submission_id VARCHAR(255) PRIMARY KEY,
        problem_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        code TEXT NOT NULL,
        language VARCHAR(50) NOT NULL,
        status BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_case_results (
        id SERIAL PRIMARY KEY,
        submission_id VARCHAR(255),
        test_case_number INTEGER,
        status BOOLEAN,
        execution_time INTEGER,
        memory_usage INTEGER,
        FOREIGN KEY (submission_id) REFERENCES submissions(submission_id)
      );

      CREATE TABLE IF NOT EXISTS solved (
        problem_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (problem_id, user_id),
        FOREIGN KEY (problem_id) REFERENCES problems(problem_id)
      );

      CREATE TABLE IF NOT EXISTS contests (
        id SERIAL PRIMARY KEY,
        contest_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contest_problems (
        contest_id VARCHAR(255) NOT NULL,
        problem_id VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 100,
        order_index INTEGER NOT NULL,
        PRIMARY KEY (contest_id, problem_id),
        FOREIGN KEY (contest_id) REFERENCES contests(contest_id) ON DELETE CASCADE,
        FOREIGN KEY (problem_id) REFERENCES problems(problem_id)
      );

      CREATE TABLE IF NOT EXISTS contest_participants (
        contest_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        total_score INTEGER DEFAULT 0,
        rank INTEGER,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (contest_id, user_id),
        FOREIGN KEY (contest_id) REFERENCES contests(contest_id) ON DELETE CASCADE
      );

      -- Add contest_id to submissions table for tracking contest submissions
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS contest_id VARCHAR(255) REFERENCES contests(contest_id),
      ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
    `);

    // Read and insert problems
    const problems = await readProblemMetadata();
    
    for (const problem of problems) {
      await pool.query(
        `INSERT INTO problems (problem_id, title, difficulty, hidden) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (problem_id) DO UPDATE 
         SET title = EXCLUDED.title, 
             difficulty = EXCLUDED.difficulty,
             hidden = EXCLUDED.hidden`,
        [problem.problemId, problem.title, problem.difficulty, problem.hidden]
      );
    }

    console.log("Database tables initialized");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

module.exports = initDB;