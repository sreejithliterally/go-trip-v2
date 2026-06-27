const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class BookingPricing extends Model {}

BookingPricing.init({
  id:                { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bookingId:         { type: DataTypes.UUID, allowNull: false, unique: true },
  nights:            { type: DataTypes.INTEGER },
  basePrice:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  extraPersonCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  mealCharge:        { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  subtotal:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  couponId:          { type: DataTypes.UUID },
  couponCode:        { type: DataTypes.TEXT },
  discountAmount:    { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  taxableAmount:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  taxRatePct:        { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 18.00 },
  taxAmount:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  platformFee:       { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  platformFeePct:    { type: DataTypes.DECIMAL(5, 2) },
  totalAmount:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency:          { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
  snapshotJson:      { type: DataTypes.JSONB, allowNull: false },
}, {
  sequelize,
  tableName:   'booking_pricing',
  modelName:   'BookingPricing',
  underscored:  true,
  timestamps:   false,
});

module.exports = BookingPricing;
