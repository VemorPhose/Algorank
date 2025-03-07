const path = require('path');
// Configure dotenv to look in the server root directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');
const fs = require('fs').promises;

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

async function getActiveAndUpcomingContestProblems() {
  const { rows } = await pool.query(`
    SELECT DISTINCT cp.problem_id 
    FROM contest_problems cp
    JOIN contests c ON cp.contest_id = c.contest_id
    WHERE c.status IN ('upcoming', 'active')
  `);
  return new Set(rows.map(row => row.problem_id));
}

async function updateContestStatus() {
  let client;
  try {
    // Log connection attempt
    console.log('Attempting to connect to database...');
    console.log('Using credentials:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      // Don't log password
    });

    // Get a client from the pool
    client = await pool.connect();
    console.log('Successfully connected to database');

    const now = new Date();

    // Get all contests that need status updates
    const { rows: contests } = await client.query(`
      SELECT contest_id, status, start_time, end_time 
      FROM contests 
      WHERE 
        (status = 'upcoming' AND start_time <= NOW()) OR
        (status = 'active' AND end_time <= NOW())
    `);

    for (const contest of contests) {
      let newStatus;
      if (contest.status === 'upcoming' && now >= contest.end_time) {
        newStatus = 'ended';
      } else if (contest.status === 'upcoming' && now >= contest.start_time) {
        newStatus = 'active';
      } else if (contest.status === 'active' && now >= contest.end_time) {
        newStatus = 'ended';
      }

      if (newStatus) {
        // Update contest status
        await client.query(
          'UPDATE contests SET status = $1 WHERE contest_id = $2',
          [newStatus, contest.contest_id]
        );

        // If contest has ended, handle problem unhiding
        if (newStatus === 'ended') {
          // Get problems from ended contest
          const { rows: contestProblems } = await client.query(
            'SELECT problem_id FROM contest_problems WHERE contest_id = $1',
            [contest.contest_id]
          );

          // Get problems used in active/upcoming contests
          const activeProblems = await getActiveAndUpcomingContestProblems();

          // Unhide problems that aren't used in other contests
          for (const { problem_id } of contestProblems) {
            if (!activeProblems.has(problem_id)) {
              await updateProblemHiddenStatus(problem_id, false);
            }
          }
        }
      }
    }

    console.log('Contest status update complete');
  } catch (error) {
    console.error('Error updating contest statuses:', error);
  } finally {
    if (client) {
      await client.release();
    }
    await pool.end();
  }
}

// Helper function from previous script
async function updateProblemHiddenStatus(problemId, hidden) {
  try {
    await pool.query(
      'UPDATE problems SET hidden = $1 WHERE problem_id = $2',
      [hidden, problemId]
    );

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

// Run the script
updateContestStatus();