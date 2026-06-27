const { sequelize, QueryTypes, AvailabilityCalendar, SeasonalPricing } = require('../../db/index');
const R = require('../../shared/utils/apiResponse');

const VALID_ENTITY_TYPES = ['room_type', 'full_property', 'glamping_site', 'activity_slot'];
const validateEntityType = (et) => {
  if (!VALID_ENTITY_TYPES.includes(et)) throw Object.assign(new Error('Invalid entity_type'), { status: 400 });
};

const getAvailability = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    validateEntityType(entityType);
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return R.error(res, 'startDate and endDate are required');

    // Use raw SQL to join with v_effective_price view
    const rows = await sequelize.query(
      `SELECT ac.date, ac.total_units, ac.booked_units, ac.blocked_units, ac.is_blocked,
              (ac.total_units - ac.booked_units - ac.blocked_units) AS available_units,
              vep.effective_price
       FROM availability_calendar ac
       LEFT JOIN v_effective_price vep
         ON vep.entity_type = ac.entity_type AND vep.entity_id = ac.entity_id AND vep.date = ac.date
       WHERE ac.entity_type = :entityType AND ac.entity_id = :entityId
         AND ac.date BETWEEN :startDate AND :endDate
       ORDER BY ac.date`,
      { type: QueryTypes.SELECT, replacements: { entityType, entityId, startDate, endDate } }
    );
    R.success(res, { availability: rows });
  } catch (err) { next(err); }
};

const blockDates = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    validateEntityType(entityType);
    const { dates, reason } = req.body;
    await sequelize.transaction(async (t) => {
      for (const date of dates) {
        await AvailabilityCalendar.update(
          { isBlocked: true, blockReason: reason || null, updatedAt: new Date() },
          { where: { entityType, entityId, date }, transaction: t }
        );
      }
    });
    R.success(res, { message: `${dates.length} date(s) blocked` });
  } catch (err) { next(err); }
};

const unblockDates = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    validateEntityType(entityType);
    const { dates } = req.body;
    await sequelize.transaction(async (t) => {
      for (const date of dates) {
        await AvailabilityCalendar.update(
          { isBlocked: false, blockReason: null, updatedAt: new Date() },
          { where: { entityType, entityId, date }, transaction: t }
        );
      }
    });
    R.success(res, { message: `${dates.length} date(s) unblocked` });
  } catch (err) { next(err); }
};

const setPriceOverrides = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    validateEntityType(entityType);
    const { overrides } = req.body;
    await sequelize.transaction(async (t) => {
      for (const { date, price } of overrides) {
        await AvailabilityCalendar.update(
          { priceOverride: price, updatedAt: new Date() },
          { where: { entityType, entityId, date }, transaction: t }
        );
      }
    });
    R.success(res, { message: `${overrides.length} price override(s) set` });
  } catch (err) { next(err); }
};

const listSeasonalPricing = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const rows = await SeasonalPricing.findAll({ where: { entityType, entityId }, order: [['start_date', 'ASC']] });
    R.success(res, { seasonalPricing: rows });
  } catch (err) { next(err); }
};

const createSeasonalPricing = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    validateEntityType(entityType);
    const { name, startDate, endDate, priceOverride, priceModifierPct, priority = 0 } = req.body;
    if (!priceOverride && !priceModifierPct) return R.error(res, 'Provide either priceOverride or priceModifierPct');
    if (priceOverride && priceModifierPct)  return R.error(res, 'Cannot set both priceOverride and priceModifierPct');

    const sp = await SeasonalPricing.create({ entityType, entityId, name, startDate, endDate, priceOverride: priceOverride || null, priceModifierPct: priceModifierPct || null, priority });
    R.created(res, { seasonalPricing: sp });
  } catch (err) { next(err); }
};

const deleteSeasonalPricing = async (req, res, next) => {
  try {
    await SeasonalPricing.destroy({ where: { id: req.params.id } });
    R.success(res, { message: 'Deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAvailability, blockDates, unblockDates, setPriceOverrides, listSeasonalPricing, createSeasonalPricing, deleteSeasonalPricing };
