/**
 * @swagger
 * /glamping:
 *   get:
 *     tags: [Glamping]
 *     summary: List glamping sites (public)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Glamping list
 *   post:
 *     tags: [Glamping]
 *     summary: Create glamping listing (vendor)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, totalCamps, pricePerCampNight, locationJson]
 *             properties:
 *               title:                { type: string }
 *               description:          { type: string }
 *               locationJson:         { type: object }
 *               cancellationPolicyId: { type: string, format: uuid }
 *               totalCamps:           { type: integer, minimum: 1 }
 *               adultsPerCamp:        { type: integer, minimum: 1, default: 2 }
 *               infantsPerCamp:       { type: integer, minimum: 0, default: 1 }
 *               pricePerCampNight:    { type: number }
 *               extraAdultCharge:     { type: number, default: 0 }
 *               extraInfantCharge:    { type: number, default: 0 }
 *               aboutExperience:      { type: string, description: "Narrative description of the overall experience" }
 *               inclusions:           { type: array, items: { type: string }, description: "What is included in the stay" }
 *               exclusions:           { type: array, items: { type: string }, description: "What is NOT included" }
 *               whatsprovided:        { type: array, items: { type: string }, description: "Items/amenities provided at the site" }
 *               thingsToCarry:        { type: array, items: { type: string }, description: "What guests should bring" }
 *               howToReach:           { type: string, description: "Directions / travel instructions" }
 *     responses:
 *       201:
 *         description: Glamping listing created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid, description: "Listing ID — use for all subsequent operations" }
 *
 * /glamping/{id}:
 *   get:
 *     tags: [Glamping]
 *     summary: Get glamping site by ID (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Glamping detail
 *   patch:
 *     tags: [Glamping]
 *     summary: Update glamping listing (vendor)
 *     description: All fields are optional — only supplied fields are updated.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:                { type: string }
 *               description:          { type: string }
 *               locationJson:         { type: object }
 *               cancellationPolicyId: { type: string, format: uuid }
 *               totalCamps:           { type: integer, minimum: 1 }
 *               adultsPerCamp:        { type: integer, minimum: 1 }
 *               infantsPerCamp:       { type: integer, minimum: 0 }
 *               pricePerCampNight:    { type: number }
 *               extraAdultCharge:     { type: number }
 *               extraInfantCharge:    { type: number }
 *               aboutExperience:      { type: string }
 *               inclusions:           { type: array, items: { type: string } }
 *               exclusions:           { type: array, items: { type: string } }
 *               whatsprovided:        { type: array, items: { type: string } }
 *               thingsToCarry:        { type: array, items: { type: string } }
 *               howToReach:           { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /glamping/{id}/meal-plans:
 *   post:
 *     tags: [Glamping]
 *     summary: Upsert meal plans for a glamping site (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mealPlans:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/MealPlanInput'
 *     responses:
 *       200:
 *         description: Meal plans updated
 *
 * /glamping/{id}/images:
 *   post:
 *     tags: [Glamping]
 *     summary: Upload glamping images (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Images uploaded
 *
 * /glamping/{id}/submit:
 *   post:
 *     tags: [Glamping]
 *     summary: Submit listing for approval (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Submitted
 *
 * /glamping/{id}/approve:
 *   post:
 *     tags: [Glamping]
 *     summary: Approve glamping listing (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Approved
 */

const router = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('./glamping.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireVendor, requireAdmin } = require('../../shared/middleware/auth');
const { uploadListingImage } = require('../../shared/middleware/upload');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',    ctrl.list);
router.get('/:id', ctrl.get);

// ── Vendor ────────────────────────────────────────────────────────────────────
router.post('/',
  authenticate, requireVendor,
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('locationJson').isObject(),
  body('cancellationPolicyId').optional().isUUID(),
  body('totalCamps').isInt({ min: 1 }),
  body('adultsPerCamp').optional().isInt({ min: 1 }),
  body('infantsPerCamp').optional().isInt({ min: 0 }),
  body('pricePerCampNight').isDecimal(),
  body('extraAdultCharge').optional().isDecimal(),
  body('extraInfantCharge').optional().isDecimal(),
  body('aboutExperience').optional().trim(),
  body('inclusions').optional().isArray(),
  body('inclusions.*').optional().isString().trim(),
  body('exclusions').optional().isArray(),
  body('exclusions.*').optional().isString().trim(),
  body('whatsprovided').optional().isArray(),
  body('whatsprovided.*').optional().isString().trim(),
  body('thingsToCarry').optional().isArray(),
  body('thingsToCarry.*').optional().isString().trim(),
  body('howToReach').optional().trim(),
  validate,
  ctrl.create
);

router.patch('/:id',
  authenticate, requireVendor,
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('locationJson').optional().isObject(),
  body('cancellationPolicyId').optional().isUUID(),
  body('totalCamps').optional().isInt({ min: 1 }),
  body('adultsPerCamp').optional().isInt({ min: 1 }),
  body('infantsPerCamp').optional().isInt({ min: 0 }),
  body('pricePerCampNight').optional().isDecimal(),
  body('extraAdultCharge').optional().isDecimal(),
  body('extraInfantCharge').optional().isDecimal(),
  body('aboutExperience').optional().trim(),
  body('inclusions').optional().isArray(),
  body('inclusions.*').optional().isString().trim(),
  body('exclusions').optional().isArray(),
  body('exclusions.*').optional().isString().trim(),
  body('whatsprovided').optional().isArray(),
  body('whatsprovided.*').optional().isString().trim(),
  body('thingsToCarry').optional().isArray(),
  body('thingsToCarry.*').optional().isString().trim(),
  body('howToReach').optional().trim(),
  validate,
  ctrl.update
);
router.post('/:id/meal-plans',    authenticate, requireVendor, ctrl.upsertMealPlan);
router.post('/:id/images',        authenticate, requireVendor, uploadListingImage.array('images', 10), ctrl.uploadImages);
router.post('/:id/submit',        authenticate, requireVendor, ctrl.submitForApproval);
router.post('/:id/approve',       authenticate, requireAdmin,  ctrl.approve);

module.exports = router;
