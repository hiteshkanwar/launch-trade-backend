const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const contactRoutes = require("./routes/contactRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const userRoutes = require("./routes/userRoutes");


dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" })); // Increase JSON payload limit
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // Allow frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true // Allow cookies & authentication headers
}));


app.use("/api/contacts", contactRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/users", userRoutes);

// Simple test route
app.get("/api/test", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Backend is working!",
      env: process.env.NODE_ENV,
      timestamp: new Date(),
    });
  });
  

module.exports = app;