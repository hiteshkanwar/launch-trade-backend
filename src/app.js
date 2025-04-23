const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
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

console.log(555555,process.env.NODE_ENV == "development" )


app.use("/api/tokens", tokenRoutes);
app.use("/api/users", userRoutes);

module.exports = app;