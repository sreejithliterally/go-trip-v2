const { Op } = require('sequelize');
const {
  sequelize,
  Listing,
  ListingImage,
  HotelProperty,
  Package,
  Activity,
  GlampingSite,
} = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');

// Batch-fetch cover images for a list of listing IDs — avoids N+1 queries
const attachCoverImages = async (rows) => {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const covers = await ListingImage.findAll({
    where: { entityId: ids, isCover: true },
    attributes: ['entityId', 'url'],
  });
  const coverMap = Object.fromEntries(covers.map((c) => [c.entityId, c.url]));
  return rows.map((l) => ({ ...l.toJSON(), coverImage: coverMap[l.id] ?? null }));
};

// Build OR condition: match title or any text inside locationJson
const buildTextCondition = (q) => ({
  [Op.or]: [
    { title: { [Op.iLike]: `%${q}%` } },
    sequelize.where(
      sequelize.cast(sequelize.col('location_json'), 'text'),
      { [Op.iLike]: `%${q}%` }
    ),
  ],
});

/**
 * GET /api/v1/search
 *
 * type=hotel     — q (name/location), checkIn*, checkOut*, rooms?, guests?
 * type=package   — q (name/location), category?
 * type=activity  — q (name/location), category? (maps to activityType)
 * type=glamping  — q (location), checkIn*, checkOut*
 *
 * * required for hotel and glamping
 */
const search = async (req, res, next) => {
  try {
    const { type, q, checkIn, checkOut, rooms, guests, category } = req.query;
    const { limit, offset } = parsePagination(req.query);

    const baseWhere = { category: type, isPublished: true, status: 'active' };
    if (q && q.trim()) Object.assign(baseWhere, buildTextCondition(q.trim()));

    const order = [['avg_rating', 'DESC NULLS LAST'], ['created_at', 'DESC']];
    const common = { where: baseWhere, order, limit, offset, subQuery: false };

    let count, rows, meta = {};

    if (type === 'hotel') {
      ({ count, rows } = await Listing.findAndCountAll({
        ...common,
        include: [{ model: HotelProperty, as: 'hotelProperty' }],
      }));
      meta = { checkIn, checkOut, rooms: rooms ? Number(rooms) : null, guests: guests ? Number(guests) : null };

    } else if (type === 'package') {
      ({ count, rows } = await Listing.findAndCountAll({
        ...common,
        include: [{ model: Package, as: 'package' }],
      }));

    } else if (type === 'activity') {
      const activityWhere = category ? { activityType: category } : {};
      const hasFilter = Boolean(category);
      ({ count, rows } = await Listing.findAndCountAll({
        ...common,
        include: [{
          model: Activity,
          as: 'activity',
          ...(hasFilter ? { where: activityWhere, required: true } : {}),
        }],
      }));

    } else if (type === 'glamping') {
      ({ count, rows } = await Listing.findAndCountAll({
        ...common,
        include: [{ model: GlampingSite, as: 'glampingSite' }],
      }));
      meta = { checkIn, checkOut };
    }

    const data = await attachCoverImages(rows);
    R.paginated(res, { data, total: count, limit, offset, ...(Object.keys(meta).length ? { meta } : {}) });
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/search/suggestions
 *
 * q     — required, min 2 chars; matched against title + locationJson
 * type  — optional; restrict to one category
 *
 * Returns:
 *   locations — distinct city+state pairs extracted from matching listings
 *   listings  — matching listing names (up to 8)
 */
const suggestions = async (req, res, next) => {
  try {
    const { q, type } = req.query;

    const categoryFilter = type
      ? { category: type }
      : { category: { [Op.in]: ['hotel', 'package', 'activity', 'glamping'] } };

    const published = { isPublished: true, status: 'active' };
    const textCond  = buildTextCondition(q.trim());

    // Fetch both title matches and location matches in one query
    const matches = await Listing.findAll({
      where: { ...categoryFilter, ...published, ...textCond },
      attributes: ['id', 'title', 'category', 'locationJson'],
      order: [['avg_rating', 'DESC NULLS LAST'], ['created_at', 'DESC']],
      limit: 30,
    });

    // Split: listing suggestions (title matches) and location suggestions
    const listingSuggestions = [];
    const cityMap = new Map(); // city → { city, state, categories: Set }

    for (const row of matches) {
      const loc = row.locationJson || {};
      const city = loc.city?.trim() || null;
      const state = loc.state?.trim() || null;

      // Title match → listing suggestion
      if (row.title.toLowerCase().includes(q.trim().toLowerCase())) {
        listingSuggestions.push({
          id: row.id,
          title: row.title,
          category: row.category,
          city,
          state,
        });
      }

      // Any match with a valid city → location suggestion
      if (city) {
        const key = city.toLowerCase();
        if (!cityMap.has(key)) {
          cityMap.set(key, { city, state, categories: new Set([row.category]) });
        } else {
          cityMap.get(key).categories.add(row.category);
        }
      }
    }

    const locations = Array.from(cityMap.values())
      .map(({ city, state, categories }) => ({
        city,
        state,
        categories: [...categories],
      }))
      .slice(0, 6);

    R.success(res, {
      locations,
      listings: listingSuggestions.slice(0, 8),
    });
  } catch (err) { next(err); }
};

module.exports = { search, suggestions };
