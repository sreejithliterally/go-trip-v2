const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class CouponUsage extends Model {}

CouponUsage.init({
  id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  couponId:  { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID, allowNull: false },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  usedAt:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'coupon_usages',
  modelName:   'CouponUsage',
  underscored:  true,
  timestamps:   false,
  indexes: [{ unique: true, fields: ['coupon_id', 'booking_id'] }],
});

module.exports = CouponUsage;
