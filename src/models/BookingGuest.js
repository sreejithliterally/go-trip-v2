const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class BookingGuest extends Model {}

BookingGuest.init({
  id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  fullName:  { type: DataTypes.TEXT, allowNull: false },
  age:       { type: DataTypes.INTEGER },
  idType:    { type: DataTypes.TEXT },
  idNumber:  { type: DataTypes.TEXT },
  isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  sequelize,
  tableName:   'booking_guests',
  modelName:   'BookingGuest',
  underscored:  true,
  timestamps:   false,
});

module.exports = BookingGuest;
