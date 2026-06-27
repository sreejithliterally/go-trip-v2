const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/connection');

// Junction table — room_type <-> amenity_master
class RoomAmenity extends Model {}

RoomAmenity.init({
  roomTypeId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  amenityId:  { type: DataTypes.UUID, allowNull: false, primaryKey: true },
}, {
  sequelize,
  tableName:   'room_amenities',
  modelName:   'RoomAmenity',
  underscored:  true,
  timestamps:   false,
});

module.exports = RoomAmenity;
