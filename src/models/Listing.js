const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Listing extends Model {}

Listing.init({
  id:                   { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  vendorId:             { type: DataTypes.UUID, allowNull: false },
  category:             { type: DataTypes.ENUM('hotel', 'package', 'glamping', 'activity'), allowNull: false },
  title:                { type: DataTypes.TEXT, allowNull: false },
  description:          { type: DataTypes.TEXT },
  status:               { type: DataTypes.ENUM('draft', 'pending_approval', 'active', 'suspended', 'archived'), allowNull: false, defaultValue: 'draft' },
  isPublished:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  locationJson:         { type: DataTypes.JSONB, allowNull: false },
  cancellationPolicyId: { type: DataTypes.UUID },
  avgRating:            { type: DataTypes.DECIMAL(3, 2) },
  reviewCount:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  metaJson:             { type: DataTypes.JSONB },
}, {
  sequelize,
  tableName:   'listings',
  modelName:   'Listing',
  underscored:  true,
  timestamps:   true,
});

module.exports = Listing;
