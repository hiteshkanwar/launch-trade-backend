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
sequelize.sync({ alter: true })  // ✅ This updates tables without dropping data
  .then(() => console.log("✅ Database synchronized"))
  .catch((err) => console.error("❌ Database sync failed:", err));


module.exports = { sequelize };
