const { sequelize, QueryTypes } = require('../../db/index');

// Search bounds for the cross-room-type combination search. Hotels realistically
// have a handful of room types, so this keeps the backtracking search small and
// fast without needing true bin-packing optimization.
const MAX_COMBINATION_ROOM_TYPES = 6;
const MAX_DISTINCT_TYPES_IN_COMBO = 4;

/**
 * Fetch capacity-relevant columns for all active room types in a hotel property.
 * Infants are intentionally excluded — infants never gate room/combination fit.
 */
const getHotelRoomCapacities = (hotelPropertyId) =>
  sequelize.query(
    `SELECT id, name, total_units AS "totalUnits",
            max_adult_occupancy AS "maxAdultOccupancy",
            max_child_occupancy AS "maxChildOccupancy",
            base_price_per_night AS "basePricePerNight"
     FROM room_types
     WHERE hotel_property_id = :hotelPropertyId AND is_active = true`,
    { type: QueryTypes.SELECT, replacements: { hotelPropertyId } }
  );

/**
 * Does N units of this single room type fit the party?
 * Independent caps: adults and children are each checked against their own max,
 * not pooled. Infants are not a parameter here — they never gate capacity.
 */
const fitsSingleRoomType = ({ room, adults, children = 0, unitsBooked = 1 }) =>
  room.maxAdultOccupancy * unitsBooked >= adults &&
  room.maxChildOccupancy * unitsBooked >= children;

/**
 * Minimum units of ONE room type needed to fit the party, bounded by its totalUnits.
 * Returns null if even totalUnits copies of this room type can't fit the party.
 */
const minUnitsForRoom = ({ room, adults, children = 0 }) => {
  const unitsForAdults   = room.maxAdultOccupancy > 0 ? Math.ceil(adults / room.maxAdultOccupancy) : Infinity;
  const unitsForChildren = children > 0 ? (room.maxChildOccupancy > 0 ? Math.ceil(children / room.maxChildOccupancy) : Infinity) : 0;
  const units = Math.max(unitsForAdults, unitsForChildren, 1);
  if (!Number.isFinite(units) || units > room.totalUnits) return null;
  return { roomTypeId: room.id, roomTypeName: room.name, units };
};

/**
 * Cross-room-type combination search within one hotel property: find the
 * lowest-price combination of (roomType, units) pairs across DIFFERENT room
 * types that together fit the party. Bounded backtracking with branch-and-bound
 * pruning — not true bin-packing at scale, since hotels have few room types.
 */
const findCrossRoomTypeCombination = ({ rooms, adults, children, nights }) => {
  const candidates = [...rooms]
    .sort((a, b) => (b.maxAdultOccupancy + b.maxChildOccupancy) - (a.maxAdultOccupancy + a.maxChildOccupancy))
    .slice(0, MAX_COMBINATION_ROOM_TYPES);

  let best = null; // { cost, combo: [{ room, units }] }

  const search = (index, remainingAdults, remainingChildren, currentCombo, currentCost) => {
    if (remainingAdults <= 0 && remainingChildren <= 0) {
      if (!best || currentCost < best.cost) best = { cost: currentCost, combo: currentCombo };
      return;
    }
    if (index >= candidates.length) return;
    if (currentCombo.length >= MAX_DISTINCT_TYPES_IN_COMBO) return;
    if (best && currentCost >= best.cost) return; // prune

    const room = candidates[index];
    const unitsForAdults   = room.maxAdultOccupancy > 0 ? Math.ceil(Math.max(remainingAdults, 0) / room.maxAdultOccupancy) : 0;
    const unitsForChildren = room.maxChildOccupancy > 0 ? Math.ceil(Math.max(remainingChildren, 0) / room.maxChildOccupancy) : 0;
    const maxUsefulUnits = Math.min(room.totalUnits, Math.max(unitsForAdults, unitsForChildren, 1));

    // Try using this room type at units = maxUsefulUnits down to 0 (skip it).
    for (let units = maxUsefulUnits; units >= 0; units--) {
      const newAdults   = units > 0 ? Math.max(0, remainingAdults - units * room.maxAdultOccupancy) : remainingAdults;
      const newChildren = units > 0 ? Math.max(0, remainingChildren - units * room.maxChildOccupancy) : remainingChildren;
      const newCost      = currentCost + units * room.basePricePerNight * nights;
      const newCombo      = units > 0 ? [...currentCombo, { room, units }] : currentCombo;
      search(index + 1, newAdults, newChildren, newCombo, newCost);
    }
  };

  search(0, adults, children, [], 0);
  if (!best || !best.combo.length) return null;

  return {
    combinationType: 'cross_room_type',
    rooms: best.combo.map(({ room, units }) => ({
      roomTypeId: room.id,
      roomTypeName: room.name,
      units,
      maxAdultOccupancy: room.maxAdultOccupancy,
      maxChildOccupancy: room.maxChildOccupancy,
      basePricePerNight: room.basePricePerNight,
    })),
    estimatedTotalPerNight: best.combo.reduce((s, { room, units }) => s + units * room.basePricePerNight, 0),
  };
};

/**
 * Full combination search: try same-room-type first (cheapest single-type fit),
 * then cross-room-type if nothing single-type works. Returns [] if nothing at
 * all fits, even using every room type at full totalUnits.
 */
const findRoomCombination = ({ rooms, adults, children = 0, nights = 1 }) => {
  const suggestions = [];

  const sameTypeFits = rooms
    .map((room) => ({ room, fit: minUnitsForRoom({ room, adults, children }) }))
    .filter((r) => r.fit)
    .sort((a, b) => a.room.basePricePerNight * a.fit.units - b.room.basePricePerNight * b.fit.units);

  if (sameTypeFits.length) {
    const { room, fit } = sameTypeFits[0];
    suggestions.push({
      combinationType: 'same_room_type',
      rooms: [{
        roomTypeId: room.id, roomTypeName: room.name, units: fit.units,
        maxAdultOccupancy: room.maxAdultOccupancy, maxChildOccupancy: room.maxChildOccupancy,
        basePricePerNight: room.basePricePerNight,
      }],
      estimatedTotalPerNight: room.basePricePerNight * fit.units,
    });
    return suggestions;
  }

  const cross = findCrossRoomTypeCombination({ rooms, adults, children, nights });
  if (cross) suggestions.push(cross);

  return suggestions;
};

/**
 * Orchestrator used by bookings.controller.js checkAvailability/hold and by
 * search.controller.js. Infants are deliberately not a parameter anywhere in
 * this module — they never gate capacity or drive combination suggestions.
 */
const resolveCapacity = async ({ hotelPropertyId, entityId, adults, children = 0, unitsBooked = 1, nights = 1 }) => {
  const rooms = await getHotelRoomCapacities(hotelPropertyId);
  const current = rooms.find((r) => r.id === entityId);

  if (current && fitsSingleRoomType({ room: current, adults, children, unitsBooked })) {
    return { fits: true };
  }

  const suggestions = findRoomCombination({ rooms, adults, children, nights });
  return { fits: false, suggestions, noFitInHotel: suggestions.length === 0 };
};

module.exports = {
  getHotelRoomCapacities,
  fitsSingleRoomType,
  minUnitsForRoom,
  findRoomCombination,
  resolveCapacity,
};
