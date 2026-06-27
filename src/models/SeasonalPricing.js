const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class SeasonalPricing extends Model {}

SeasonalPricing.init({
  id:               { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  entityType:       { type: DataTypes.ENUM('room_type', 'full_property', 'glamping_site', 'activity_slot'), allowNull: false },
  entityId:         { type: DataTypes.UUID, allowNull: false },
  name:             { type: DataTypes.TEXT, allowNull: false },
  startDate:        { type: DataTypes.DATEONLY, allowNull: false },
  endDate:          { type: DataTypes.DATEONLY, allowNull: false },
  priceOverride:    { type: DataTypes.DECIMAL(10, 2) },
  priceModifierPct: { type: DataTypes.DECIMAL(5, 2) },
  priority:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  createdAt:        { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'seasonal_pricing',
  modelName:   'SeasonalPricing',
  underscored:  true,
  timestamps:   false,
});

module.exports = SeasonalPricing;
