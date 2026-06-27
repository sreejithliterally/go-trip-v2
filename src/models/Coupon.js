const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Coupon extends Model {}

Coupon.init({
  id:                   { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  code:                 { type: DataTypes.TEXT, unique: true, allowNull: false },
  discountType:         { type: DataTypes.ENUM('flat','percentage'), allowNull: false },
  discountValue:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  maxDiscountCap:       { type: DataTypes.DECIMAL(10, 2) },
  minBookingAmount:     { type: DataTypes.DECIMAL(10, 2) },
  validFrom:            { type: DataTypes.DATEONLY, allowNull: false },
  validTo:              { type: DataTypes.DATEONLY, allowNull: false },
  usageLimit:           { type: DataTypes.INTEGER },
  usedCount:            { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  applicableCategories: { type: DataTypes.ARRAY(DataTypes.TEXT) },
  createdBy:            { type: DataTypes.UUID },
  isActive:             { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  createdAt:            { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'coupons',
  modelName:   'Coupon',
  underscored:  true,
  timestamps:   false,
});

module.exports = Coupon;
