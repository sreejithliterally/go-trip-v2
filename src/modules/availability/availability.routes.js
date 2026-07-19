/**
 * @swagger
 * /availability/{entityType}/{entityId}:
 *   get:
 *     tags: [Availability]
 *     summary: Get availability calendar for an entity (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string, enum: [room_type, full_property, glamping_site, activity_slot] }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Availability calendar
 *
 * /availability/{entityType}/{entityId}/block:
 *   patch:
 *     tags: [Availability]
 *     summary: Block specific dates (vendor)
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dates]
 *             properties:
 *               dates:  { type: array, items: { type: string, format: date } }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Dates blocked
 *
 * /availability/{entityType}/{entityId}/unblock:
 *   patch:
 *     tags: [Availability]
 *     summary: Unblock specific dates (vendor)
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dates]
 *             properties:
 *               dates: { type: array, items: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: Dates unblocked
 *
 * /availability/{entityType}/{entityId}/price-override:
 *   patch:
 *     tags: [Availability]
 *     summary: Override price for specific dates (vendor)
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [overrides]
 *             properties:
 *               overrides:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:  { type: string, format: date }
 *                     price: { type: number }
 *     responses:
 *       200:
 *         description: Price overrides saved
 *
 * /availability/{entityType}/{entityId}/seasonal:
 *   get:
 *     tags: [Availability]
 *     summary: List seasonal pricing rules (vendor)
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Seasonal pricing list
 *   post:
 *     tags: [Availability]
 *     summary: Create a seasonal pricing rule (vendor)
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, startDate, endDate]
 *             properties:
 *               name:              { type: string }
 *               startDate:         { type: string, format: date }
 *               endDate:           { type: string, format: date }
 *               priceOverride:     { type: number, description: "Flat replacement price. Provide exactly one of priceOverride/priceModifierPct." }
 *               priceModifierPct:  { type: number, description: "Percentage modifier applied to base price. Provide exactly one of priceOverride/priceModifierPct." }
 *               priority:          { type: integer, default: 0, description: "Highest priority wins when seasonal rules overlap" }
 *     responses:
 *       201:
 *         description: Seasonal pricing rule created
 *
 * /availability/seasonal/{id}:
 *   delete:
 *     tags: [Availability]
 *     summary: Delete a seasonal pricing rule (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */

const router = require('express').Router();
const { body, query: qv } = require('express-validator');
const ctrl     = require('./availability.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireVendor } = require('../../shared/middleware/auth');

// ── Public ────────────────────────────────────────────────────────────────────
// Check availability for an entity over a date range
router.get('/:entityType/:entityId', ctrl.getAvailability);

// ── Vendor ────────────────────────────────────────────────────────────────────
// Block / unblock specific dates
router.patch('/:entityType/:entityId/block',
  authenticate, requireVendor,
  body('dates').isArray({ min: 1 }),
  body('reason').optional().trim(),
  validate,
  ctrl.blockDates
);

router.patch('/:entityType/:entityId/unblock',
  authenticate, requireVendor,
  body('dates').isArray({ min: 1 }),
  validate,
  ctrl.unblockDates
);

// Override price for specific dates
router.patch('/:entityType/:entityId/price-override',
  authenticate, requireVendor,
  body('overrides').isArray({ min: 1 }),  // [{date, price}]
  validate,
  ctrl.setPriceOverrides
);

// Seasonal pricing CRUD
router.get('/:entityType/:entityId/seasonal',   authenticate, requireVendor, ctrl.listSeasonalPricing);
router.post('/:entityType/:entityId/seasonal',
  authenticate, requireVendor,
  body('name').notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('priceOverride').optional().isDecimal(),
  body('priceModifierPct').optional().isDecimal(),
  body('priority').optional().isInt({ min: 0 }),
  validate,
  ctrl.createSeasonalPricing
);
router.delete('/seasonal/:id',  authenticate, requireVendor, ctrl.deleteSeasonalPricing);

module.exports = router;
