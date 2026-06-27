/**
 * @swagger
 * /bookings/check-availability:
 *   post:
 *     tags: [Bookings]
 *     summary: Check availability and get price breakdown
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityType, entityId, checkIn, adults]
 *             properties:
 *               entityType:  { type: string, enum: [room_type, full_property, glamping_site, activity_slot] }
 *               entityId:    { type: string, format: uuid }
 *               checkIn:     { type: string, format: date }
 *               checkOut:    { type: string, format: date }
 *               adults:      { type: integer, minimum: 1 }
 *               infants:     { type: integer, minimum: 0 }
 *               unitsBooked: { type: integer, minimum: 1 }
 *               mealPlanId:  { type: string, format: uuid }
 *               couponCode:  { type: string }
 *     responses:
 *       200:
 *         description: Availability confirmed with price breakdown
 *       409:
 *         description: Not available for selected dates
 *
 * /bookings/hold:
 *   post:
 *     tags: [Bookings]
 *     summary: Hold a booking pending payment (step 2)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingRequest'
 *     responses:
 *       201:
 *         description: Booking held — proceed to payment
 *
 * /bookings/my:
 *   get:
 *     tags: [Bookings]
 *     summary: List my bookings
 *     responses:
 *       200:
 *         description: Booking list
 *
 * /bookings/my/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get my booking detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking detail
 *
 * /bookings/{id}/cancel:
 *   post:
 *     tags: [Bookings]
 *     summary: Cancel a booking
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Booking cancelled
 *
 * /bookings/vendor:
 *   get:
 *     tags: [Bookings]
 *     summary: List bookings for my properties (vendor)
 *     responses:
 *       200:
 *         description: Vendor booking list
 *
 * /bookings/{id}/checkin:
 *   patch:
 *     tags: [Bookings]
 *     summary: Mark guest as checked-in (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Checked in
 *
 * /bookings/{id}/checkout:
 *   patch:
 *     tags: [Bookings]
 *     summary: Mark guest as checked-out (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Checked out
 *
 * /bookings/{id}/no-show:
 *   patch:
 *     tags: [Bookings]
 *     summary: Mark booking as no-show (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Marked no-show
 *
 * /bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List all bookings (admin)
 *     responses:
 *       200:
 *         description: All bookings
 *
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get any booking by ID (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking detail
 *
 * /bookings/{id}/override-status:
 *   patch:
 *     tags: [Bookings]
 *     summary: Override booking status (admin)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [confirmed, cancelled, completed] }
 *     responses:
 *       200:
 *         description: Status overridden
 */

const router = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('./bookings.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin, requireVendor } = require('../../shared/middleware/auth');

// All booking routes require authentication
router.use(authenticate);

// Step 1: Check availability + price breakdown
router.post('/check-availability',
  body('entityType').isIn(['room_type','full_property','glamping_site','activity_slot']),
  body('entityId').isUUID(),
  body('checkIn').isISO8601(),
  body('checkOut').optional().isISO8601(),
  body('adults').isInt({ min: 1 }),
  body('infants').optional().isInt({ min: 0 }),
  body('unitsBooked').optional().isInt({ min: 1 }),
  body('mealPlanId').optional().isUUID(),
  body('couponCode').optional().trim(),
  validate,
  ctrl.checkAvailability
);

// Step 2: Hold booking
router.post('/hold',
  body('entityType').isIn(['room_type','full_property','glamping_site','activity_slot','package']),
  body('entityId').isUUID(),
  body('listingId').isUUID(),
  body('checkIn').isISO8601(),
  body('checkOut').optional().isISO8601(),
  body('adults').isInt({ min: 1 }),
  body('infants').optional().isInt({ min: 0 }),
  body('unitsBooked').optional().isInt({ min: 1 }),
  body('mealPlanId').optional().isUUID(),
  body('activitySlotId').optional().isUUID(),
  body('couponCode').optional().trim(),
  body('specialRequests').optional().trim(),
  body('guests').optional().isArray(),
  validate,
  ctrl.hold
);

// My bookings (user)
router.get('/my',         ctrl.myBookings);
router.get('/my/:id',     ctrl.myBookingDetail);

// Cancel
router.post('/:id/cancel',
  body('reason').optional().trim(),
  validate,
  ctrl.cancel
);

// Vendor: their bookings
router.get('/vendor',     requireVendor, ctrl.vendorBookings);
router.patch('/:id/checkin',    requireVendor, ctrl.checkIn);
router.patch('/:id/checkout',   requireVendor, ctrl.checkOut);
router.patch('/:id/no-show',    requireVendor, ctrl.noShow);

// Admin
router.get('/',           requireAdmin, ctrl.adminList);
router.get('/:id',        requireAdmin, ctrl.adminGet);
router.patch('/:id/override-status', requireAdmin,
  body('status').isIn(['confirmed','cancelled','completed']),
  validate,
  ctrl.adminOverrideStatus
);

module.exports = router;
