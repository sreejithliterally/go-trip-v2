const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class PackageItinerary extends Model {}

PackageItinerary.init({
  id:             { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  packageId:      { type: DataTypes.UUID, allowNull: false },
  dayNumber:      { type: DataTypes.INTEGER, allowNull: false },
  title:          { type: DataTypes.TEXT, allowNull: false },
  description:    { type: DataTypes.TEXT },
  activitiesJson: { type: DataTypes.JSONB },
  mealsCovered:   { type: DataTypes.ARRAY(DataTypes.TEXT) },
}, {
  sequelize,
  tableName:   'package_itineraries',
  modelName:   'PackageItinerary',
  underscored:  true,
  timestamps:   false,
  indexes: [{ unique: true, fields: ['package_id', 'day_number'] }],
});

module.exports = PackageItinerary;
