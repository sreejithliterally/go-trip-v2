const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class HotelProperty extends Model {}

HotelProperty.init({
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId:     { type: DataTypes.UUID, allowNull: false, unique: true },
  listingType:   { type: DataTypes.ENUM('full_property', 'rooms'), allowNull: false },
  starRating:    { type: DataTypes.INTEGER },
  checkInTime:   { type: DataTypes.TIME, allowNull: false, defaultValue: '14:00' },
  checkOutTime:  { type: DataTypes.TIME, allowNull: false, defaultValue: '11:00' },
  totalFloors:   { type: DataTypes.INTEGER },
  propertyRules: { type: DataTypes.ARRAY(DataTypes.TEXT) },
}, {
  sequelize,
  tableName:   'hotel_properties',
  modelName:   'HotelProperty',
  underscored:  true,
  timestamps:   false,
});

module.exports = HotelProperty;
