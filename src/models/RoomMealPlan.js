const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class RoomMealPlan extends Model {}

RoomMealPlan.init({
  id:                { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  roomTypeId:        { type: DataTypes.UUID, allowNull: false },
  planCode:          { type: DataTypes.TEXT, allowNull: false },
  label:             { type: DataTypes.TEXT, allowNull: false },
  includesBreakfast:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  includesLunch:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  includesDinner:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  includesSnacks:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  breakfastPricePp:   { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  lunchPricePp:       { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  dinnerPricePp:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  snacksPricePp:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  snacksDescription:  { type: DataTypes.TEXT },
  isDefault:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  sequelize,
  tableName:   'room_meal_plans',
  modelName:   'RoomMealPlan',
  underscored:  true,
  timestamps:   false,
  indexes: [{ unique: true, fields: ['room_type_id', 'plan_code'] }],
});

module.exports = RoomMealPlan;
