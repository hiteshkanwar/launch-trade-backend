const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    wallet_address: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true 
    },
    created_at: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    }
}, {
    timestamps: false // Ensures created_at is used instead of Sequelize's default timestamps
});

module.exports = User;
