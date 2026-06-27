const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class VendorProfile extends Model {}

VendorProfile.init({
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId:          { type: DataTypes.UUID, allowNull: false, unique: true },
  businessName:    { type: DataTypes.TEXT, allowNull: false },
  gstNumber:       { type: DataTypes.TEXT },
  panNumber:       { type: DataTypes.TEXT, allowNull: false },
  bankAccountJson: { type: DataTypes.JSONB },
  kycStatus:       { type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
  kycDocsJson:     { type: DataTypes.JSONB },
  commissionPct:   { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 10.00 },
  approvedAt:      { type: DataTypes.DATE },
  approvedBy:      { type: DataTypes.UUID },
}, {
  sequelize,
  tableName:   'vendor_profiles',
  modelName:   'VendorProfile',
  underscored:  true,
  timestamps:   true,
});

module.exports = VendorProfile;
