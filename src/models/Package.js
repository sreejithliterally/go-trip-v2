const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Package extends Model {}

Package.init({
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId:     { type: DataTypes.UUID, allowNull: false, unique: true },
  totalDays:     { type: DataTypes.INTEGER, allowNull: false },
  totalNights:   { type: DataTypes.INTEGER, allowNull: false },
  pricePerPerson:{ type: DataTypes.DECIMAL(10, 2), allowNull: false },
  minGroupSize:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  maxGroupSize:  { type: DataTypes.INTEGER },
  inclusions:    { type: DataTypes.ARRAY(DataTypes.TEXT) },
  exclusions:    { type: DataTypes.ARRAY(DataTypes.TEXT) },
  whatsprovided: { type: DataTypes.ARRAY(DataTypes.TEXT), field: 'whats_provided' },
  bookingMode:   { type: DataTypes.ENUM('direct', 'enquiry_only'), allowNull: false, defaultValue: 'enquiry_only' },
}, {
  sequelize,
  tableName:   'packages',
  modelName:   'Package',
  underscored:  true,
  timestamps:   false,
});

module.exports = Package;
