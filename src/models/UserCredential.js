const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class UserCredential extends Model {}

UserCredential.init({
  userId:       { type: DataTypes.UUID, primaryKey: true },
  passwordHash: { type: DataTypes.TEXT, allowNull: false },
  updatedAt:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'user_credentials',
  modelName:   'UserCredential',
  underscored:  true,
  timestamps:   false,
});

module.exports = UserCredential;
