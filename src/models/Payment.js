const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Payment extends Model {}

Payment.init({
  id:               { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bookingId:        { type: DataTypes.UUID, allowNull: false },
  gateway:          { type: DataTypes.ENUM('razorpay','stripe','cashfree','manual'), allowNull: false },
  gatewayOrderId:   { type: DataTypes.TEXT },
  gatewayPaymentId: { type: DataTypes.TEXT, unique: true },
  amount:           { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency:         { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
  status:           { type: DataTypes.ENUM('initiated','pending','captured','failed','refunded'), allowNull: false, defaultValue: 'initiated' },
  method:           { type: DataTypes.TEXT },
  gatewayResponse:  { type: DataTypes.JSONB },
  paidAt:           { type: DataTypes.DATE },
  createdAt:        { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'payments',
  modelName:   'Payment',
  underscored:  true,
  timestamps:   false,
});

module.exports = Payment;
