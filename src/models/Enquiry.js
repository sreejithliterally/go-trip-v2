const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Enquiry extends Model {}

Enquiry.init({
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId:   { type: DataTypes.UUID, allowNull: false },
  userId:      { type: DataTypes.UUID, allowNull: false },
  travelDate:  { type: DataTypes.DATEONLY },
  adults:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  infants:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  message:     { type: DataTypes.TEXT },
  status:      { type: DataTypes.ENUM('open', 'replied', 'closed', 'converted'), allowNull: false, defaultValue: 'open' },
  vendorReply: { type: DataTypes.TEXT },
  repliedAt:   { type: DataTypes.DATE },
  createdAt:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'enquiries',
  modelName:   'Enquiry',
  underscored:  true,
  timestamps:   false,
});

module.exports = Enquiry;
