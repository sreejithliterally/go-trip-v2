const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class CancellationPolicy extends Model {}

CancellationPolicy.init({
  id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name:      { type: DataTypes.TEXT, allowNull: false },
  isSystem:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  rulesJson: { type: DataTypes.JSONB, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'cancellation_policies',
  modelName:   'CancellationPolicy',
  underscored:  true,
  timestamps:   false,
});

module.exports = CancellationPolicy;
