/**
 * @swagger
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: List activities (public)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *           enum: [trekking, water_sports, adventure, cultural, wildlife, cycling, camping, yoga_wellness, culinary, sightseeing]
 *     responses:
 *       200:
 *         description: Activity list
 *   post:
 *     tags: [Activities]
 *     summary: Create activity listing (vendor)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, activityType, basePriceAdult, locationJson]
 *             properties:
 *               title:             { type: string }
 *               description:       { type: string }
 *               locationJson:      { type: object }
 *               cancellationPolicyId: { type: string, format: uuid }
 *               activityType:
 *                 type: string
 *                 enum: [trekking, water_sports, adventure, cultural, wildlife, cycling, camping, yoga_wellness, culinary, sightseeing]
 *               basePriceAdult:    { type: number }
 *               basePriceInfant:   { type: number, default: 0 }
 *               minAge:            { type: integer }
 *               totalSlotsPerDay:  { type: integer, description: "Total capacity per day (time slots can be added later)" }
 *               aboutExperience:   { type: string, description: "Narrative about the overall experience" }
 *               inclusions:        { type: array, items: { type: string } }
 *               exclusions:        { type: array, items: { type: string } }
 *               whatsprovided:     { type: array, items: { type: string } }
 *               thingsToCarry:     { type: array, items: { type: string } }
 *               howToReach:        { type: string }
 *               highlightIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: "UUIDs from GET /admin/activity-highlights?activityType=<type>"
 *     responses:
 *       201:
 *         description: Activity listing created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid, description: "Listing ID — use for all subsequent operations" }
 *
 * /activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Get activity by ID (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Activity detail with highlights and slots
 *   patch:
 *     tags: [Activities]
 *     summary: Update activity listing (vendor) — all fields optional
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
 *               title:             { type: string }
 *               description:       { type: string }
 *               locationJson:      { type: object }
 *               cancellationPolicyId: { type: string, format: uuid }
 *               activityType:
 *                 type: string
 *                 enum: [trekking, water_sports, adventure, cultural, wildlife, cycling, camping, yoga_wellness, culinary, sightseeing]
 *               basePriceAdult:    { type: number }
 *               basePriceInfant:   { type: number }
 *               minAge:            { type: integer }
 *               totalSlotsPerDay:  { type: integer }
 *               aboutExperience:   { type: string }
 *               inclusions:        { type: array, items: { type: string } }
 *               exclusions:        { type: array, items: { type: string } }
 *               whatsprovided:     { type: array, items: { type: string } }
 *               thingsToCarry:     { type: array, items: { type: string } }
 *               howToReach:        { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /activities/{id}/highlights:
 *   put:
 *     tags: [Activities]
 *     summary: Set highlights for an activity — replaces existing selection (vendor)
 *     description: |
 *       Pass UUIDs from `GET /admin/activity-highlights?activityType=<type>`.
 *       All highlights must belong to the activity's type. Replaces the full set.
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
 *             required: [highlightIds]
 *             properties:
 *               highlightIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Highlights updated
 *
 * /activities/{id}/slots:
 *   post:
 *     tags: [Activities]
 *     summary: Add a time slot to an activity (vendor)
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
 *             required: [label]
 *             properties:
 *               label:           { type: string }
 *               startTime:       { type: string, example: '09:00' }
 *               durationMinutes: { type: integer }
 *               maxParticipants: { type: integer }
 *     responses:
 *       201:
 *         description: Slot created
 *
 * /activities/{id}/slots/{slotId}:
 *   patch:
 *     tags: [Activities]
 *     summary: Update an activity slot (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Slot updated
 *
 * /activities/{id}/images:
 *   post:
 *     tags: [Activities]
 *     summary: Upload activity images (vendor)
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
 * /activities/{id}/submit:
 *   post:
 *     tags: [Activities]
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
 * /activities/{id}/approve:
 *   post:
 *     tags: [Activities]
 *     summary: Approve activity listing (admin)
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
const ctrl     = require('./activities.controller');
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
  body('activityType').isIn(ctrl.ACTIVITY_TYPES),
  body('basePriceAdult').isDecimal(),
  body('basePriceInfant').optional().isDecimal(),
  body('minAge').optional().isInt({ min: 0 }),
  body('totalSlotsPerDay').optional().isInt({ min: 1 }),
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
  body('highlightIds').optional().isArray(),
  body('highlightIds.*').optional().isUUID(),
  validate,
  ctrl.create
);

router.patch('/:id',
  authenticate, requireVendor,
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('locationJson').optional().isObject(),
  body('cancellationPolicyId').optional().isUUID(),
  body('activityType').optional().isIn(ctrl.ACTIVITY_TYPES),
  body('basePriceAdult').optional().isDecimal(),
  body('basePriceInfant').optional().isDecimal(),
  body('minAge').optional().isInt({ min: 0 }),
  body('totalSlotsPerDay').optional().isInt({ min: 1 }),
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

router.put('/:id/highlights',
  authenticate, requireVendor,
  body('highlightIds').isArray(),
  body('highlightIds.*').isUUID(),
  validate,
  ctrl.setHighlights
);

router.post('/:id/slots',
  authenticate, requireVendor,
  body('label').notEmpty(),
  body('startTime').optional(),
  body('durationMinutes').optional().isInt({ min: 1 }),
  body('maxParticipants').optional().isInt({ min: 1 }),
  validate,
  ctrl.createSlot
);
router.patch('/:id/slots/:slotId', authenticate, requireVendor, ctrl.updateSlot);
router.post('/:id/images',         authenticate, requireVendor, uploadListingImage.array('images', 10), ctrl.uploadImages);
router.post('/:id/submit',         authenticate, requireVendor, ctrl.submitForApproval);
router.post('/:id/approve',        authenticate, requireAdmin,  ctrl.approve);

module.exports = router;
