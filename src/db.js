const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
});

// 🔹 Automatically update the database schema (Only use in DEV)
sequelize.sync({ alter: true })
    .then(() => console.log("✅ Database schema updated"))
    .catch(err => console.error("❌ Error syncing database:", err));

module.exports = { sequelize };
