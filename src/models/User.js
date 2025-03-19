const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    wallet_address: { 
        type: DataTypes.STRING(255), 
        allowNull: false, 
        unique: true 
    }
}, {
    timestamps: true, // ✅ Ensure Sequelize handles createdAt and updatedAt
});

module.exports = User;
