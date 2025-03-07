const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');
const fs = require('fs').promises;
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function updateProblemHiddenStatus(problemId, hidden) {
  try {
    // Update database
    await pool.query(
      'UPDATE problems SET hidden = $1 WHERE problem_id = $2',
      [hidden, problemId]
    );

    // Update metadata.json
    const problemsDir = path.join(__dirname, '..', '..', 'algorank-problems', 'problems');
    const metadataPath = path.join(problemsDir, problemId, 'metadata.json');
    
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    metadata.hidden = hidden;
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error(`Error updating hidden status for problem ${problemId}:`, error);
    throw error;
  }
}

async function createContest() {
  try {
    // Get contest details
    const contestId = await question('Enter contest ID (e.g., CONTEST1): ');
    const title = await question('Enter contest title: ');
    const description = await question('Enter contest description: ');
    
    // Get date and time inputs
    const startDate = await question('Enter start date (YYYY-MM-DD): ');
    const startTime = await question('Enter start time (HH:MM): ');
    const durationHours = await question('Enter contest duration (hours): ');
    
    // Calculate timestamps
    const startTimestamp = new Date(`${startDate}T${startTime}`);
    const endTimestamp = new Date(startTimestamp.getTime() + durationHours * 60 * 60 * 1000);

    // Get problems first
    const numProblems = parseInt(await question('Enter number of problems: '));
    const problems = [];

    for (let i = 0; i < numProblems; i++) {
      const problemId = await question(`Enter problem ID for problem ${i + 1}: `);
      const points = await question(`Enter points for problem ${i + 1}: `);
      
      // Verify problem exists
      const problemExists = await pool.query(
        'SELECT 1 FROM problems WHERE problem_id = $1',
        [problemId]
      );

      if (problemExists.rows.length === 0) {
        throw new Error(`Problem ${problemId} does not exist`);
      }

      problems.push({
        problemId,
        points: parseInt(points),
        orderIndex: i + 1
      });
    }

    // Begin transaction
    await pool.query('BEGIN');

    try {
      // Insert contest first
      await pool.query(
        `INSERT INTO contests (contest_id, title, description, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, 'upcoming')`,
        [contestId, title, description, startTimestamp, endTimestamp]
      );

      // Wait for contest insertion to complete
      await pool.query('COMMIT');
      
      // Start new transaction for problems
      await pool.query('BEGIN');

      // Insert problems
      for (const problem of problems) {
        await pool.query(
          `INSERT INTO contest_problems (contest_id, problem_id, points, order_index)
           VALUES ($1, $2, $3, $4)`,
          [contestId, problem.problemId, problem.points, problem.orderIndex]
        );

        // Set problems as hidden
        await updateProblemHiddenStatus(problem.problemId, true);
      }

      // Commit problem insertions
      await pool.query('COMMIT');

      console.log(`Contest ${contestId} created successfully!`);
      console.log('Problems added:');
      problems.forEach(p => {
        console.log(`- ${p.problemId} (${p.points} points)`);
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating contest:', error.message);
  } finally {
    rl.close();
    pool.end();
  }
}

createContest().catch(console.error);