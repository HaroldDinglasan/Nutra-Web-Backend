const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const stockRoutes = require("./routes/stockRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const userRoutes = require("./routes/userRoutes");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", stockRoutes);
app.use("/api", employeeRoutes);
app.use("/api", userRoutes);
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
