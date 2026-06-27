const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class AvailabilityCalendar extends Model {}

AvailabilityCalendar.init({
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  entityType:    { type: DataTypes.ENUM('room_type', 'full_property', 'glamping_site', 'activity_slot'), allowNull: false },
  entityId:      { type: DataTypes.UUID, allowNull: false },
  date:          { type: DataTypes.DATEONLY, allowNull: false },
  totalUnits:    { type: DataTypes.INTEGER, allowNull: false },
  bookedUnits:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  blockedUnits:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isBlocked:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  blockReason:   { type: DataTypes.TEXT },
  priceOverride: { type: DataTypes.DECIMAL(10, 2) },
  minStayNights: { type: DataTypes.INTEGER },
  updatedAt:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'availability_calendar',
  modelName:   'AvailabilityCalendar',
  underscored:  true,
  timestamps:   false,
  indexes: [{ unique: true, fields: ['entity_type', 'entity_id', 'date'] }],
});

module.exports = AvailabilityCalendar;
