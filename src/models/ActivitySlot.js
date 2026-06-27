const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class ActivitySlot extends Model {}

ActivitySlot.init({
  id:                   { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  activityId:           { type: DataTypes.UUID, allowNull: false },
  label:                { type: DataTypes.TEXT, allowNull: false },
  durationMinutes:      { type: DataTypes.INTEGER },
  startTime:            { type: DataTypes.TIME },
  maxParticipants:      { type: DataTypes.INTEGER },
  priceOverrideAdult:   { type: DataTypes.DECIMAL(10, 2) },
  priceOverrideInfant:  { type: DataTypes.DECIMAL(10, 2) },
  isActive:             { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  sequelize,
  tableName:   'activity_slots',
  modelName:   'ActivitySlot',
  underscored:  true,
  timestamps:   false,
});

module.exports = ActivitySlot;
