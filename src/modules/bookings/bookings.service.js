const { sequelize, QueryTypes, RoomType, GlampingSite, ActivitySlot, Package, Activity, HotelProperty, Listing } = require('../../db/index');

/**
 * Resolve entity metadata needed for price calculation and vendor assignment.
 */
const resolveEntityMeta = async (entityType, entityId) => {
  if (entityType === 'room_type' || entityType === 'full_property') {
    const rows = await sequelize.query(
      `SELECT rt.hotel_property_id, rt.max_adult_occupancy, rt.max_child_occupancy, rt.total_units,
              l.vendor_id, l.category, l.cancellation_policy_id, l.location_json,
              hp.listing_type
       FROM room_types rt
       JOIN hotel_properties hp ON hp.id = rt.hotel_property_id
       JOIN listings l ON l.id = hp.listing_id
       WHERE rt.id = :entityId`,
      { type: QueryTypes.SELECT, replacements: { entityId } }
    );
    if (!rows.length) throw Object.assign(new Error('Room type not found'), { status: 404 });
    return { ...rows[0], mealPlanType: 'room' };
  }

  if (entityType === 'glamping_site') {
    const rows = await sequelize.query(
      `SELECT gs.adults_per_camp AS default_adult_occupancy, gs.extra_adult_charge,
              l.vendor_id, l.category, l.cancellation_policy_id
       FROM glamping_sites gs JOIN listings l ON l.id = gs.listing_id WHERE gs.id = :entityId`,
      { type: QueryTypes.SELECT, replacements: { entityId } }
    );
    if (!rows.length) throw Object.assign(new Error('Glamping site not found'), { status: 404 });
    return { ...rows[0], mealPlanType: 'glamping' };
  }

  if (entityType === 'activity_slot') {
    const rows = await sequelize.query(
      `SELECT l.vendor_id, l.category, l.cancellation_policy_id
       FROM activity_slots asl
       JOIN activities a ON a.id = asl.activity_id
       JOIN listings l ON l.id = a.listing_id WHERE asl.id = :entityId`,
      { type: QueryTypes.SELECT, replacements: { entityId } }
    );
    if (!rows.length) throw Object.assign(new Error('Activity slot not found'), { status: 404 });
    return { ...rows[0], default_adult_occupancy: 1, extra_adult_charge: 0 };
  }

  if (entityType === 'package') {
    const rows = await sequelize.query(
      `SELECT l.vendor_id, l.category, l.cancellation_policy_id
       FROM packages p JOIN listings l ON l.id = p.listing_id WHERE p.id = :entityId`,
      { type: QueryTypes.SELECT, replacements: { entityId } }
    );
    if (!rows.length) throw Object.assign(new Error('Package not found'), { status: 404 });
    return { ...rows[0], default_adult_occupancy: 1, extra_adult_charge: 0 };
  }

  throw Object.assign(new Error('Unsupported entity type'), { status: 400 });
};

/**
 * Lock and check availability rows inside an existing transaction.
 * Returns { available: boolean, slots: [] }
 */
const checkInventory = async (client, entityType, entityId, checkIn, checkOut, unitsRequested) => {
  const endDate = checkOut || checkIn;
  const rows = await client.query(
    `SELECT date, total_units - booked_units - blocked_units AS available_units, is_blocked
     FROM availability_calendar
     WHERE entity_type = :entityType AND entity_id = :entityId
       AND date >= :checkIn AND date < :endDate
     ORDER BY date FOR UPDATE`,
    { type: QueryTypes.SELECT, replacements: { entityType, entityId, checkIn, endDate }, transaction: client._transaction }
  );
  // Note: for real FOR UPDATE with Sequelize transactions, we use raw query on the managed transaction
  const unavailable = rows.filter(r => r.is_blocked || r.available_units < unitsRequested);
  return { available: unavailable.length === 0, slots: rows, unavailable };
};

/**
 * Generate a booking reference via DB sequence function.
 */
const generateRef = async (t) => {
  const [row] = await sequelize.query(`SELECT generate_booking_ref() AS ref`, { type: QueryTypes.SELECT, transaction: t });
  return row.ref;
};

module.exports = { resolveEntityMeta, checkInventory, generateRef };
