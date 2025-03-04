const express = require("express");
const cors = require("cors");
const initDB = require("./config/initDB");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/submit", require("./routes/submit"));
app.use("/api/problems", require("./routes/problems"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDB();
});