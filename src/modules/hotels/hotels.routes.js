/**
 * @swagger
 * /hotels:
 *   get:
 *     tags: [Hotels]
 *     summary: List hotel listings (public)
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
 *     responses:
 *       200:
 *         description: Hotel list
 *   post:
 *     tags: [Hotels]
 *     summary: Create a hotel listing (vendor)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, listingType, locationJson]
 *             properties:
 *               title:                 { type: string }
 *               description:           { type: string }
 *               listingType:           { type: string, enum: [full_property, rooms] }
 *               starRating:            { type: integer, minimum: 1, maximum: 5 }
 *               checkInTime:           { type: string, example: '14:00' }
 *               checkOutTime:          { type: string, example: '11:00' }
 *               locationJson:          { type: object }
 *               cancellationPolicyId:  { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Hotel listing created
 *
 * /hotels/{id}:
 *   get:
 *     tags: [Hotels]
 *     summary: Get hotel by ID (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hotel detail
 *   patch:
 *     tags: [Hotels]
 *     summary: Update hotel listing (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /hotels/{id}/room-types:
 *   get:
 *     tags: [Hotels]
 *     summary: List room types with meal plans and amenities (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Room type list
 *   post:
 *     tags: [Hotels]
 *     summary: Create a room type (vendor, rooms listing only)
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
 *             $ref: '#/components/schemas/RoomTypeRequest'
 *     responses:
 *       201:
 *         description: Room type created, availability seeded for 365 days
 *
 * /hotels/{id}/property-details:
 *   post:
 *     tags: [Hotels]
 *     summary: Set full-property capacity and pricing (vendor, full_property only)
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
 *             required: [bedType, maxGuests, pricePerNight]
 *             properties:
 *               bedType:          { type: string, enum: [single, double, queen, king, bunk, sofa_bed, twin] }
 *               totalBeds:        { type: integer, minimum: 1 }
 *               maxGuests:        { type: integer, minimum: 1 }
 *               pricePerNight:    { type: number }
 *               extraGuestCharge: { type: number }
 *     responses:
 *       200:
 *         description: Property details saved
 *
 * /hotels/{id}/room-types/{roomTypeId}:
 *   patch:
 *     tags: [Hotels]
 *     summary: Update a room type and meal plans (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: roomTypeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoomTypeRequest'
 *     responses:
 *       200:
 *         description: Room type updated
 *
 * /hotels/{id}/room-types/{roomTypeId}/images:
 *   post:
 *     tags: [Hotels]
 *     summary: Upload images for a room type (vendor, max 3)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: roomTypeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 maxItems: 3
 *                 items: { type: string, format: binary }
 *                 description: Up to 3 images total across all uploads for this room type
 *     responses:
 *       201:
 *         description: Images uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 images:
 *                   type: array
 *                   items: { type: object }
 *       400:
 *         description: Image limit exceeded (max 3 per room type)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /hotels/{id}/room-types/{roomTypeId}/amenities:
 *   put:
 *     tags: [Hotels]
 *     summary: Set amenities for a room type — replaces existing list (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: roomTypeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amenityIds]
 *             properties:
 *               amenityIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Amenities updated
 *
 * /hotels/{id}/images:
 *   post:
 *     tags: [Hotels]
 *     summary: Upload hotel images (vendor)
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
 * /hotels/{id}/submit:
 *   post:
 *     tags: [Hotels]
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
 * /hotels/{id}/approve:
 *   post:
 *     tags: [Hotels]
 *     summary: Approve hotel listing (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Approved
 *
 * /hotels/{id}/suspend:
 *   post:
 *     tags: [Hotels]
 *     summary: Suspend hotel listing (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Suspended
 */

const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl     = require('./hotels.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireVendor, requireAdmin } = require('../../shared/middleware/auth');
const { uploadListingImage } = require('../../shared/middleware/upload');

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/',     ctrl.list);
router.get('/:id',  ctrl.get);
router.get('/:id/room-types', ctrl.getRoomTypes);

// ── Vendor ───────────────────────────────────────────────────────────────────
router.post('/',
  authenticate, requireVendor,
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('locationJson').isObject(),
  body('listingType').isIn(['full_property', 'rooms']),
  body('starRating').optional().isInt({ min: 1, max: 5 }),
  body('checkInTime').optional(),
  body('checkOutTime').optional(),
  body('cancellationPolicyId').optional().isUUID(),
  validate,
  ctrl.create
);

router.patch('/:id',
  authenticate, requireVendor,
  validate,
  ctrl.update
);

// Shortcut for full_property listings: set property-level capacity + pricing in one call.
// Internally creates (or updates) the single room_type row.
router.post('/:id/property-details',
  authenticate, requireVendor,
  body('bedType').isIn(['single','double','queen','king','bunk','sofa_bed','twin']),
  body('totalBeds').optional().isInt({ min: 1 }),
  body('maxGuests').isInt({ min: 1 }),
  body('pricePerNight').isDecimal(),
  body('extraGuestCharge').optional().isDecimal(),
  validate,
  ctrl.setFullPropertyDetails
);

// Room type CRUD — meal plans included inline via mealPlans[]
router.post('/:id/room-types',
  authenticate, requireVendor,
  body('name').notEmpty().trim(),
  body('bedType').isIn(['single','double','queen','king','bunk','sofa_bed','twin']),
  body('numBeds').optional().isInt({ min: 1 }),
  body('floorAreaSqft').optional().isInt({ min: 1 }),
  body('totalUnits').isInt({ min: 1 }),
  body('defaultAdultOccupancy').optional().isInt({ min: 1 }),
  body('maxAdultOccupancy').optional().isInt({ min: 1 }),
  body('defaultChildOccupancy').optional().isInt({ min: 0 }),
  body('maxChildOccupancy').optional().isInt({ min: 0 }),
  body('defaultInfantOccupancy').optional().isInt({ min: 0 }),
  body('maxInfantOccupancy').optional().isInt({ min: 0 }),
  body('basePricePerNight').isDecimal(),
  body('extraAdultCharge').optional().isDecimal(),
  body('extraChildCharge').optional().isDecimal(),
  body('extraInfantCharge').optional().isDecimal(),
  body('amenityIds').optional().isArray(),
  body('amenityIds.*').optional().isUUID(),
  body('mealPlans').optional().isArray(),
  body('mealPlans.*.planCode').optional().isIn(['EP','CP','MAP','AP','AI']),
  body('mealPlans.*.includesBreakfast').optional().isBoolean(),
  body('mealPlans.*.includesLunch').optional().isBoolean(),
  body('mealPlans.*.includesDinner').optional().isBoolean(),
  body('mealPlans.*.includesSnacks').optional().isBoolean(),
  body('mealPlans.*.isDefault').optional().isBoolean(),
  validate,
  ctrl.createRoomType
);

router.patch('/:id/room-types/:roomTypeId',
  authenticate, requireVendor,
  body('mealPlans').optional().isArray(),
  validate,
  ctrl.updateRoomType
);

// Amenities
router.put('/:id/room-types/:roomTypeId/amenities',
  authenticate, requireVendor,
  body('amenityIds').isArray(),
  validate,
  ctrl.setAmenities
);

// Room-type images (max 3 per room type)
router.post('/:id/room-types/:roomTypeId/images',
  authenticate, requireVendor,
  uploadListingImage.array('images', 3),
  ctrl.uploadRoomTypeImages
);

// Images
router.post('/:id/images',
  authenticate, requireVendor,
  uploadListingImage.array('images', 10),
  ctrl.uploadImages
);

// Publish / admin approve
router.post('/:id/submit',    authenticate, requireVendor,  ctrl.submitForApproval);
router.post('/:id/approve',   authenticate, requireAdmin,   ctrl.approve);
router.post('/:id/suspend',   authenticate, requireAdmin,   ctrl.suspend);

module.exports = router;
