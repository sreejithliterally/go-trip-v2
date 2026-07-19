const { Op } = require('sequelize');
const {
  sequelize,
  Listing,
  ListingImage,
  HotelProperty,
  RoomType,
  Package,
  Activity,
  GlampingSite,
} = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const { findRoomCombination, fitsSingleRoomType } = require('../../shared/utils/capacityResolver');
const R = require('../../shared/utils/apiResponse');

const MAX_CAPACITY_PAGE_ATTEMPTS = 4;

// Batch-fetch cover images for a list of listing IDs — avoids N+1 queries
const attachCoverImages = async (rows) => {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const covers = await ListingImage.findAll({
    where: { entityId: ids, isCover: true },
    attributes: ['entityId', 'url'],
  });
  const coverMap = Object.fromEntries(covers.map((c) => [c.entityId, c.url]));
  return rows.map((l) => ({ ...l.toJSON(), coverImage: coverMap[l.id] ?? null, ...(l.capacityFit !== undefined ? { capacityFit: l.capacityFit } : {}) }));
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
    const { type, q, checkIn, checkOut, rooms, guests, adults, children, category } = req.query;
    const { limit, offset } = parsePagination(req.query);

    const baseWhere = { category: type, isPublished: true, status: 'active' };
    if (q && q.trim()) Object.assign(baseWhere, buildTextCondition(q.trim()));

    const order = [['avg_rating', 'DESC NULLS LAST'], ['created_at', 'DESC']];
    const common = { where: baseWhere, order, limit, offset, subQuery: false };

    let count, rows, meta = {}, approximateTotal = false;

    if (type === 'hotel') {
      const adultsN = adults ? Number(adults) : 0;
      const childrenN = children ? Number(children) : 0;
      const capacityAware = adultsN > 0 || childrenN > 0;

      const fetchPage = (pageOffset) => Listing.findAndCountAll({
        ...common,
        offset: pageOffset,
        include: [{
          model: HotelProperty, as: 'hotelProperty', required: capacityAware,
          include: [{
            model: RoomType, as: 'roomTypes', where: { isActive: true }, required: capacityAware,
            attributes: ['id', 'name', 'totalUnits', 'maxAdultOccupancy', 'maxChildOccupancy', 'basePricePerNight'],
          }],
        }],
      });

      if (!capacityAware) {
        ({ count, rows } = await fetchPage(offset));
      } else {
        // Filter for exact capacity fit in-process using the already-loaded
        // roomTypes (no N+1 queries), fetching subsequent pages if the current
        // page comes up short after filtering. `count` becomes an upper bound,
        // since an exact total would require scanning the full unpaginated set.
        approximateTotal = true;
        let collected = [];
        let pageOffset = offset;
        let attempts = 0;
        let lastCount = 0;
        while (collected.length < limit && attempts < MAX_CAPACITY_PAGE_ATTEMPTS) {
          const page = await fetchPage(pageOffset);
          lastCount = page.count;
          if (!page.rows.length) break;
          const filtered = page.rows.filter((l) => {
            const roomTypes = l.hotelProperty?.roomTypes || [];
            if (roomTypes.some((r) => fitsSingleRoomType({ room: r, adults: adultsN, children: childrenN, unitsBooked: r.totalUnits }))) return true;
            return findRoomCombination({ rooms: roomTypes, adults: adultsN, children: childrenN, nights: 1 }).length > 0;
          });
          filtered.forEach((l) => {
            const roomTypes = l.hotelProperty?.roomTypes || [];
            const fit = findRoomCombination({ rooms: roomTypes, adults: adultsN, children: childrenN, nights: 1 });
            l.capacityFit = fit[0] ? { combinationType: fit[0].combinationType, estimatedTotalPerNight: fit[0].estimatedTotalPerNight } : null;
          });
          collected = collected.concat(filtered);
          pageOffset += limit;
          attempts++;
          if (page.rows.length < limit) break;
        }
        rows = collected.slice(0, limit);
        count = lastCount;
      }

      meta = { checkIn, checkOut, rooms: rooms ? Number(rooms) : null, guests: guests ? Number(guests) : null, adults: adultsN || null, children: childrenN || null, approximateTotal };

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
