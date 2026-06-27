const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class User extends Model {}

User.init({
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  email:       { type: DataTypes.TEXT, unique: true, allowNull: false },
  phone:       { type: DataTypes.TEXT },
  fullName:    { type: DataTypes.TEXT, allowNull: false },
  role:        { type: DataTypes.ENUM('admin', 'vendor', 'user'), allowNull: false, defaultValue: 'user' },
  avatarUrl:   { type: DataTypes.TEXT },
  isVerified:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isActive:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastLoginAt: { type: DataTypes.DATE },
}, {
  sequelize,
  tableName:  'users',
  modelName:  'User',
  underscored: true,
  timestamps:  true,
});

module.exports = User;
