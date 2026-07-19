const express = require('express');
const { query } = require('express-validator');
const validate = require('../../shared/middleware/validate');
const { search, suggestions } = require('./search.controller');

const router = express.Router();

// ── Validators ────────────────────────────────────────────────────────────────

const searchValidators = [
  query('type')
    .isIn(['hotel', 'package', 'activity', 'glamping'])
    .withMessage('type must be one of: hotel, package, activity, glamping'),

  query('q').optional().isString().trim()
    .isLength({ min: 1 }).withMessage('q must not be empty if provided'),

  // checkIn / checkOut required for hotel and glamping (validated in controller)
  query('checkIn').optional().isDate().withMessage('checkIn must be a valid date (YYYY-MM-DD)'),
  query('checkOut').optional().isDate().withMessage('checkOut must be a valid date (YYYY-MM-DD)'),

  query('rooms').optional().isInt({ min: 1 }).withMessage('rooms must be a positive integer'),
  query('guests').optional().isInt({ min: 1 }).withMessage('guests must be a positive integer'),

  // adults/children (hotel only): when present, filters/ranks results by room
  // capacity fit — see capacityResolver.js. Infants deliberately not accepted
  // here — they never gate capacity, so there's nothing for search to filter on.
  query('adults').optional().isInt({ min: 0 }).withMessage('adults must be a non-negative integer'),
  query('children').optional().isInt({ min: 0 }).withMessage('children must be a non-negative integer'),

  query('category').optional().isString().trim(),

  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
];

const suggestionValidators = [
  query('q')
    .isString().trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('q is required and must be 2–100 characters'),

  query('type')
    .optional()
    .isIn(['hotel', 'package', 'activity', 'glamping'])
    .withMessage('type must be one of: hotel, package, activity, glamping'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   - name: Search
 *     description: Cross-category search and autocomplete suggestions
 */

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search hotels, packages, activities, or glamping
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hotel, package, activity, glamping]
 *         description: Category to search
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Name or location to search (matches title and location fields)
 *       - in: query
 *         name: checkIn
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date (YYYY-MM-DD) — required for hotel and glamping
 *       - in: query
 *         name: checkOut
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date (YYYY-MM-DD) — required for hotel and glamping
 *       - in: query
 *         name: rooms
 *         schema:
 *           type: integer
 *         description: Number of rooms (hotel only, optional)
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *         description: Number of guests (hotel only, optional)
 *       - in: query
 *         name: adults
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: >
 *           Hotel only. When set (with or without children), results are filtered/ranked
 *           by whether the hotel has a room or in-hotel room combination that fits the
 *           party. See capacityFit in the response.
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Hotel only. Ages 2-12, used together with adults for capacity filtering.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: >
 *           Activity type filter (activity only, e.g. adventure, camping, budget).
 *           Matches the activityType field on activity listings.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: >
 *           Paginated list of matching listings with coverImage. When adults/children
 *           are set for a hotel search, each listing may include capacityFit
 *           ({ combinationType, estimatedTotalPerNight }) and total becomes an
 *           upper-bound estimate rather than an exact count (see meta.approximateTotal).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total:   { type: integer, description: "Upper-bound estimate when capacity filtering is active" }
 *                 limit:   { type: integer }
 *                 offset:  { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Listing fields plus coverImage, and capacityFit when applicable
 *                     properties:
 *                       capacityFit:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           combinationType: { type: string, enum: [same_room_type, cross_room_type] }
 *                           estimatedTotalPerNight: { type: number }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     checkIn: { type: string }
 *                     checkOut: { type: string }
 *                     rooms: { type: integer, nullable: true }
 *                     guests: { type: integer, nullable: true }
 *                     adults: { type: integer, nullable: true }
 *                     children: { type: integer, nullable: true }
 *                     approximateTotal: { type: boolean, description: "True when total is an upper bound, not exact" }
 *       400:
 *         description: Validation error or missing required field
 */
router.get('/', searchValidators, validate, search);

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Autocomplete suggestions for the search bar
 *     description: >
 *       Returns matching location names (city + state) and listing titles
 *       based on the partial text typed by the user. Use to power the search
 *       bar dropdown.
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Partial text typed by the user (2-100 characters)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [hotel, package, activity, glamping]
 *         description: Optional — restrict suggestions to a specific category
 *     responses:
 *       200:
 *         description: Location suggestions and listing name suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     locations:
 *                       type: array
 *                       description: Up to 6 distinct city+state pairs
 *                       items:
 *                         type: object
 *                         properties:
 *                           city: { type: string }
 *                           state: { type: string }
 *                           categories:
 *                             type: array
 *                             items: { type: string }
 *                     listings:
 *                       type: array
 *                       description: Up to 8 listing name matches
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           title: { type: string }
 *                           category: { type: string }
 *                           city: { type: string }
 *                           state: { type: string }
 *       400:
 *         description: q is missing or too short
 */
router.get('/suggestions', suggestionValidators, validate, suggestions);

module.exports = router;
