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
    onDelete: "CASCADE",
  },
  name: { type: DataTypes.STRING, allowNull: false },
  symbol: { type: DataTypes.STRING, allowNull: false, unique: true },
  supply: { type: DataTypes.BIGINT, allowNull: false },
  description: { type: DataTypes.TEXT },
  image_url: { type: DataTypes.STRING },
  mint_address: { type: DataTypes.STRING, allowNull: false, unique: true },

  commission_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  commission_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  
  admin_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  admin_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  
  total_fee_paid_by_user: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  payment_signature: { type: DataTypes.STRING, allowNull: true },
  
  auto_liquidity: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  dex_url: { type: DataTypes.STRING },
  jupiter_url: { type: DataTypes.STRING },
  meteora_url: { type: DataTypes.STRING },
  

  initial_liquidity_token: { type: DataTypes.BIGINT, allowNull: true },
  initial_liquidity_sol: { type: DataTypes.BIGINT, allowNull: true },

  liquidity_added: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  cooldown_applied: { type: DataTypes.BOOLEAN, defaultValue: false },
  cooldown_timestamp: { type: DataTypes.DATE, allowNull: true },
  liquidity_added_at: { type: DataTypes.DATE, allowNull: true },

  mintable: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  timestamps: true,
});

User.hasMany(Token, { foreignKey: "user_id", onDelete: "CASCADE" });
Token.belongsTo(User, { foreignKey: "user_id" });

module.exports = Token;
