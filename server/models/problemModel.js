const pool = require('../config/db');

// Create 'problems' table if it doesn't exist
const createProblemsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS problems (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      difficulty VARCHAR(50) NOT NULL,
      submissions INTEGER DEFAULT 0
    );
  `;
  try {
    await pool.query(query);
    console.log('📄 Problems table ready');
  } catch (error) {
    console.error('❌ Error creating problems table:', error);
  }
};

createProblemsTable();

module.exports = pool;
