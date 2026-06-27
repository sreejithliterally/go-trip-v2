const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class AmenityMaster extends Model {}

AmenityMaster.init({
  id:       { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name:     { type: DataTypes.TEXT, allowNull: false },
  iconSlug: { type: DataTypes.TEXT },
  category: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  sequelize,
  tableName:   'amenity_master',
  modelName:   'AmenityMaster',
  underscored:  true,
  timestamps:   false,
});

module.exports = AmenityMaster;
