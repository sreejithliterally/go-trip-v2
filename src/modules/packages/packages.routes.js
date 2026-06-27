/**
 * @swagger
 * /packages:
 *   get:
 *     tags: [Packages]
 *     summary: List packages (public)
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
 *         description: Package list
 *   post:
 *     tags: [Packages]
 *     summary: Create package listing (vendor)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, totalDays, totalNights, pricePerPerson, locationJson]
 *             properties:
 *               title:          { type: string }
 *               totalDays:      { type: integer, minimum: 1 }
 *               totalNights:    { type: integer, minimum: 0 }
 *               pricePerPerson: { type: number }
 *               locationJson:   { type: object }
 *     responses:
 *       201:
 *         description: Package created
 *
 * /packages/{id}:
 *   get:
 *     tags: [Packages]
 *     summary: Get package by ID (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Package detail
 *   patch:
 *     tags: [Packages]
 *     summary: Update package listing (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /packages/{id}/enquiries:
 *   post:
 *     tags: [Packages]
 *     summary: Submit an enquiry for a package (authenticated user)
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
 *             required: [adults]
 *             properties:
 *               adults:  { type: integer, minimum: 1 }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Enquiry submitted
 *   get:
 *     tags: [Packages]
 *     summary: List enquiries for a package (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Enquiry list
 *
 * /packages/enquiries/{eid}:
 *   patch:
 *     tags: [Packages]
 *     summary: Reply to an enquiry (vendor)
 *     parameters:
 *       - in: path
 *         name: eid
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorReply]
 *             properties:
 *               vendorReply: { type: string }
 *     responses:
 *       200:
 *         description: Reply sent
 *
 * /packages/my/enquiries:
 *   get:
 *     tags: [Packages]
 *     summary: Get my submitted enquiries (authenticated user)
 *     responses:
 *       200:
 *         description: My enquiries
 *
 * /packages/{id}/itineraries:
 *   post:
 *     tags: [Packages]
 *     summary: Upsert day-by-day itinerary for a package (vendor)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Itinerary saved
 *
 * /packages/{id}/images:
 *   post:
 *     tags: [Packages]
 *     summary: Upload package images (vendor)
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
 * /packages/{id}/submit:
 *   post:
 *     tags: [Packages]
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
 * /packages/{id}/approve:
 *   post:
 *     tags: [Packages]
 *     summary: Approve package listing (admin)
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
const ctrl     = require('./packages.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireVendor, requireAdmin, requireUser } = require('../../shared/middleware/auth');
const { uploadListingImage } = require('../../shared/middleware/upload');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',    ctrl.list);
router.get('/:id', ctrl.get);

// ── Enquiry (authenticated users) ─────────────────────────────────────────────
router.post('/:id/enquiries',
  authenticate,
  body('adults').isInt({ min: 1 }),
  body('message').optional().trim(),
  validate,
  ctrl.createEnquiry
);
router.get('/:id/enquiries',    authenticate, requireVendor, ctrl.listEnquiries);
router.patch('/enquiries/:eid', authenticate, requireVendor,
  body('vendorReply').notEmpty(),
  validate,
  ctrl.replyEnquiry
);

// ── My enquiries (user) ────────────────────────────────────────────────────────
router.get('/my/enquiries', authenticate, ctrl.myEnquiries);

// ── Vendor ────────────────────────────────────────────────────────────────────
router.post('/',
  authenticate, requireVendor,
  body('title').notEmpty().trim(),
  body('locationJson').isObject(),
  body('totalDays').isInt({ min: 1 }),
  body('totalNights').isInt({ min: 0 }),
  body('pricePerPerson').isDecimal(),
  validate,
  ctrl.create
);
router.patch('/:id',                    authenticate, requireVendor, ctrl.update);
router.post('/:id/itineraries',         authenticate, requireVendor, ctrl.upsertItinerary);
router.post('/:id/images',              authenticate, requireVendor, uploadListingImage.array('images', 10), ctrl.uploadImages);
router.post('/:id/submit',              authenticate, requireVendor, ctrl.submitForApproval);
router.post('/:id/approve',             authenticate, requireAdmin,  ctrl.approve);

module.exports = router;
