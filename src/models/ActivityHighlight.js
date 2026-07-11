const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class ActivityHighlight extends Model {}

ActivityHighlight.init({
  activityId:        { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  highlightMasterId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
}, {
  sequelize,
  tableName:   'activity_highlights',
  modelName:   'ActivityHighlight',
  underscored:  true,
  timestamps:   false,
});

module.exports = ActivityHighlight;
