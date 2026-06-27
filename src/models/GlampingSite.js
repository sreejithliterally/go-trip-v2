const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class GlampingSite extends Model {}

GlampingSite.init({
  id:                 { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  listingId:          { type: DataTypes.UUID, allowNull: false, unique: true },
  totalCamps:         { type: DataTypes.INTEGER, allowNull: false },
  adultsPerCamp:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  infantsPerCamp:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  pricePerCampNight:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  extraAdultCharge:   { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  extraInfantCharge:  { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  aboutExperience:    { type: DataTypes.TEXT },
  inclusions:         { type: DataTypes.ARRAY(DataTypes.TEXT) },
  exclusions:         { type: DataTypes.ARRAY(DataTypes.TEXT) },
  whatsprovided:      { type: DataTypes.ARRAY(DataTypes.TEXT), field: 'whats_provided' },
  thingsToCarry:      { type: DataTypes.ARRAY(DataTypes.TEXT) },
  howToReach:         { type: DataTypes.TEXT },
}, {
  sequelize,
  tableName:   'glamping_sites',
  modelName:   'GlampingSite',
  underscored:  true,
  timestamps:   false,
});

module.exports = GlampingSite;
