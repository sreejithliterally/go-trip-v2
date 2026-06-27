const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class ListingHighlight extends Model {}

ListingHighlight.init({
  id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId: { type: DataTypes.UUID, allowNull: false },
  label:     { type: DataTypes.TEXT, allowNull: false },
  iconSlug:  { type: DataTypes.TEXT },
}, {
  sequelize,
  tableName:   'listing_highlights',
  modelName:   'ListingHighlight',
  underscored:  true,
  timestamps:   false,
});

module.exports = ListingHighlight;
