const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/login', async (req, res) => {
  try {
    const { userId, username, email, avatarUrl } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT 1 FROM users WHERE user_id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      // Create new user
      await pool.query(
        `INSERT INTO users (
          user_id, 
          username, 
          email, 
          avatar_url
        ) VALUES ($1, $2, $3, $4)`,
        [userId, username, email, avatarUrl]
      );
    } else {
      // Update last seen
      await pool.query(
        'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling user login:', error);
    res.status(500).json({ error: 'Failed to handle user login' });
  }
});

module.exports = router;