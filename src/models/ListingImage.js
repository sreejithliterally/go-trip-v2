const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class ListingImage extends Model {}

ListingImage.init({
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId:  { type: DataTypes.UUID, allowNull: false },
  entityType: { type: DataTypes.TEXT, allowNull: false },
  entityId:   { type: DataTypes.UUID, allowNull: false },
  url:        { type: DataTypes.TEXT, allowNull: false },
  sortOrder:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isCover:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  altText:    { type: DataTypes.TEXT },
  createdAt:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'listing_images',
  modelName:   'ListingImage',
  underscored:  true,
  timestamps:   false,
});

module.exports = ListingImage;
