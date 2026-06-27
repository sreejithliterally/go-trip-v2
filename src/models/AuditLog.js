const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

class AuditLog extends Model {}

AuditLog.init({
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  actorId:    { type: DataTypes.UUID },
  action:     { type: DataTypes.TEXT, allowNull: false },
  entityType: { type: DataTypes.TEXT, allowNull: false },
  entityId:   { type: DataTypes.UUID },
  oldValue:   { type: DataTypes.JSONB },
  newValue:   { type: DataTypes.JSONB },
  ipAddress:  { type: DataTypes.TEXT },
  userAgent:  { type: DataTypes.TEXT },
  createdAt:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName:   'audit_logs',
  modelName:   'AuditLog',
  underscored:  true,
  timestamps:   false,
});

module.exports = AuditLog;
