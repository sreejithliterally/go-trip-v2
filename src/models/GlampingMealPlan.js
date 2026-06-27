const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class GlampingMealPlan extends Model {}

GlampingMealPlan.init({
  id:                { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  glampingSiteId:    { type: DataTypes.UUID, allowNull: false },
  planCode:          { type: DataTypes.TEXT, allowNull: false },
  label:             { type: DataTypes.TEXT, allowNull: false },
  includesBreakfast: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  includesLunch:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  includesDinner:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  breakfastPricePp:  { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  lunchPricePp:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  dinnerPricePp:     { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  isDefault:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  sequelize,
  tableName:   'glamping_meal_plans',
  modelName:   'GlampingMealPlan',
  underscored:  true,
  timestamps:   false,
  indexes: [{ unique: true, fields: ['glamping_site_id', 'plan_code'] }],
});

module.exports = GlampingMealPlan;
