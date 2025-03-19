const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");
const User = require("./User");

const Token = sequelize.define("Token", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        references: { 
            model: User, 
            key: "id" 
        },
        onDelete: "CASCADE", // If a user is deleted, their tokens will also be removed
    },
    name: { type: DataTypes.STRING, allowNull: false },
    symbol: { type: DataTypes.STRING, allowNull: false, unique: true },
    supply: { type: DataTypes.BIGINT, allowNull: false },
    description: { type: DataTypes.TEXT },
    image_url: { type: DataTypes.STRING },
    mint_address: { type: DataTypes.STRING, allowNull: false, unique: true },
    commission_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
    commission_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    auto_liquidity: { type: DataTypes.BOOLEAN, defaultValue: false },
    dex_url: { type: DataTypes.STRING } // Stores Raydium DEX URL
}, {
    timestamps: true, // ✅ Enable createdAt and updatedAt fields
});

// **Associations**
User.hasMany(Token, { foreignKey: "user_id", onDelete: "CASCADE" });
Token.belongsTo(User, { foreignKey: "user_id" });

module.exports = Token;
