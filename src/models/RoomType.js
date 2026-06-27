const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class RoomType extends Model {}

RoomType.init({
  id:                     { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  hotelPropertyId:        { type: DataTypes.UUID, allowNull: false },
  name:                   { type: DataTypes.TEXT, allowNull: false },
  bedType:                { type: DataTypes.ENUM('single','double','queen','king','bunk','sofa_bed','twin'), allowNull: false },
  numBeds:                { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  floorAreaSqft:          { type: DataTypes.INTEGER },
  totalUnits:             { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  defaultAdultOccupancy:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  maxAdultOccupancy:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  defaultChildOccupancy:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  maxChildOccupancy:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  defaultInfantOccupancy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  maxInfantOccupancy:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  basePricePerNight:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  extraAdultCharge:       { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  extraChildCharge:       { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  extraInfantCharge:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  isActive:               { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  createdAt:              { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'room_types',
  modelName:   'RoomType',
  underscored:  true,
  timestamps:   false,
});

module.exports = RoomType;
