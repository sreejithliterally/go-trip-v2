const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Notification extends Model {}

Notification.init({
  id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId:    { type: DataTypes.UUID, allowNull: false },
  type:      { type: DataTypes.ENUM('booking_confirmed','booking_cancelled','payment_received','payout_processed','review_posted','enquiry_received','system'), allowNull: false },
  title:     { type: DataTypes.TEXT, allowNull: false },
  body:      { type: DataTypes.TEXT, allowNull: false },
  refType:   { type: DataTypes.TEXT },
  refId:     { type: DataTypes.UUID },
  isRead:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'notifications',
  modelName:   'Notification',
  underscored:  true,
  timestamps:   false,
});

module.exports = Notification;
