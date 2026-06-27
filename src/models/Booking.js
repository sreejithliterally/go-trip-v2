const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Booking extends Model {}

Booking.init({
  id:                 { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bookingRef:         { type: DataTypes.TEXT, unique: true, allowNull: false },
  userId:             { type: DataTypes.UUID, allowNull: false },
  listingId:          { type: DataTypes.UUID, allowNull: false },
  vendorId:           { type: DataTypes.UUID, allowNull: false },
  entityType:         { type: DataTypes.ENUM('room_type','full_property','glamping_site','activity_slot','package'), allowNull: false },
  entityId:           { type: DataTypes.UUID, allowNull: false },
  checkIn:            { type: DataTypes.DATEONLY, allowNull: false },
  checkOut:           { type: DataTypes.DATEONLY },
  adults:             { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  infants:            { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  unitsBooked:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  mealPlanId:         { type: DataTypes.UUID },
  activitySlotId:     { type: DataTypes.UUID },
  status:             { type: DataTypes.ENUM('pending_payment','hold','confirmed','checked_in','completed','cancelled','no_show'), allowNull: false, defaultValue: 'pending_payment' },
  specialRequests:    { type: DataTypes.TEXT },
  confirmedAt:        { type: DataTypes.DATE },
  checkedInAt:        { type: DataTypes.DATE },
  completedAt:        { type: DataTypes.DATE },
  cancelledAt:        { type: DataTypes.DATE },
  cancellationReason: { type: DataTypes.TEXT },
  cancelledBy:        { type: DataTypes.UUID },
}, {
  sequelize,
  tableName:   'bookings',
  modelName:   'Booking',
  underscored:  true,
  timestamps:   true,
});

module.exports = Booking;
