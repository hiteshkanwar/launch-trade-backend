require("dotenv").config();
const http = require("http");
const app = require("./app");
const { sequelize } = require("./db");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

sequelize.sync().then(() => {
    console.log("Database synchronized");
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});
