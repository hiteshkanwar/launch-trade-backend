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

const allowedOrigins = [
    "https://launchtrade.ai",
    "https://www.launchtrade.ai",
    // "http://localhost:3000"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS error: Origin not allowed"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
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