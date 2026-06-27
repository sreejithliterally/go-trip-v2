const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class VendorPayout extends Model {}

VendorPayout.init({
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  vendorId:        { type: DataTypes.UUID, allowNull: false },
  bookingId:       { type: DataTypes.UUID, allowNull: false },
  grossAmount:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  commissionAmount:{ type: DataTypes.DECIMAL(10, 2), allowNull: false },
  commissionPct:   { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  tdsAmount:       { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  netPayout:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status:          { type: DataTypes.ENUM('pending','processing','settled','failed','on_hold'), allowNull: false, defaultValue: 'pending' },
  bankTransferRef: { type: DataTypes.TEXT },
  settledAt:       { type: DataTypes.DATE },
  createdAt:       { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'vendor_payouts',
  modelName:   'VendorPayout',
  underscored:  true,
  timestamps:   false,
});

module.exports = VendorPayout;
