const express = require('express');
const cors = require('cors');
require('dotenv').config();
const problemRoutes = require('./routes/problemRoutes');
const submitRoute = require('./routes/submit');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔌 Middleware
app.use(cors());
app.use(express.json());

// 🌐 Routes
app.use('/api/problems', problemRoutes);
// Use the /api/submit route for handling file submission
app.use('/api/submit', submitRoute);


// 🚀 Server start
app.listen(PORT, () => {
  console.log(`⚡ Server running on http://localhost:${PORT}`);
});
