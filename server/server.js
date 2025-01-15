const express = require('express');
const cors = require('cors');
require('dotenv').config();
const problemRoutes = require('./routes/problemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔌 Middleware
app.use(cors());
app.use(express.json());

// 🌐 Routes
app.use('/api/problems', problemRoutes);

// 🚀 Server start
app.listen(PORT, () => {
  console.log(`⚡ Server running on http://localhost:${PORT}`);
});
