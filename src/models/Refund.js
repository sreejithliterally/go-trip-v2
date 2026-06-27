const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Refund extends Model {}

Refund.init({
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  paymentId:       { type: DataTypes.UUID, allowNull: false },
  bookingId:       { type: DataTypes.UUID, allowNull: false },
  amount:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reason:          { type: DataTypes.TEXT },
  gatewayRefundId: { type: DataTypes.TEXT },
  status:          { type: DataTypes.ENUM('requested','approved','processed','rejected'), allowNull: false, defaultValue: 'requested' },
  initiatedBy:     { type: DataTypes.UUID },
  initiatedAt:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  processedAt:     { type: DataTypes.DATE },
}, {
  sequelize,
  tableName:   'refunds',
  modelName:   'Refund',
  underscored:  true,
  timestamps:   false,
});

module.exports = Refund;
