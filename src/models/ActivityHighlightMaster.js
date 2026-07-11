const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class ActivityHighlightMaster extends Model {}

ActivityHighlightMaster.init({
  id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  activityType: { type: DataTypes.STRING(50), allowNull: false },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  description:  { type: DataTypes.TEXT },
  icon:         { type: DataTypes.STRING(100) },
  sortOrder:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isActive:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  sequelize,
  tableName:   'activity_highlight_masters',
  modelName:   'ActivityHighlightMaster',
  underscored:  true,
  timestamps:   false,
});

module.exports = ActivityHighlightMaster;
