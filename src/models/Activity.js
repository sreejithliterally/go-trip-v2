const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class Activity extends Model {}

Activity.init({
  id:               { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId:        { type: DataTypes.UUID, allowNull: false, unique: true },
  activityType:     { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'adventure' },
  basePriceAdult:   { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  basePriceInfant:  { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  minAge:           { type: DataTypes.INTEGER },
  totalSlotsPerDay: { type: DataTypes.INTEGER },
  aboutExperience:  { type: DataTypes.TEXT },
  inclusions:       { type: DataTypes.ARRAY(DataTypes.TEXT) },
  exclusions:       { type: DataTypes.ARRAY(DataTypes.TEXT) },
  whatsprovided:    { type: DataTypes.ARRAY(DataTypes.TEXT), field: 'whats_provided' },
  thingsToCarry:    { type: DataTypes.ARRAY(DataTypes.TEXT) },
  howToReach:       { type: DataTypes.TEXT },
}, {
  sequelize,
  tableName:   'activities',
  modelName:   'Activity',
  underscored:  true,
  timestamps:   false,
});

module.exports = Activity;
