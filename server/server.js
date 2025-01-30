const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/submit", require("./routes/submit"));
app.use("/api/problems", require("./routes/problems"));

const PORT = process.env.PORT || 5000;

// Database initialization
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        problem_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        difficulty VARCHAR(20),
        solved_count INTEGER DEFAULT 0
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

      INSERT INTO problems (problem_id, title, difficulty) VALUES
      ('2SUM', 'Sum of Two Numbers', 'Easy'),
      ('FIBO', 'Fibonacci Sequence', 'Easy')
      ON CONFLICT (problem_id) DO NOTHING;

    `);
    console.log("Database tables initialized");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDB();
});
