const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Review extends Model {}

Review.init({
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bookingId:   { type: DataTypes.UUID, allowNull: false, unique: true },
  userId:      { type: DataTypes.UUID, allowNull: false },
  listingId:   { type: DataTypes.UUID, allowNull: false },
  rating:      { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment:     { type: DataTypes.TEXT },
  vendorReply: { type: DataTypes.TEXT },
  repliedAt:   { type: DataTypes.DATE },
  isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdAt:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'reviews',
  modelName:   'Review',
  underscored:  true,
  timestamps:   false,
});

module.exports = Review;
