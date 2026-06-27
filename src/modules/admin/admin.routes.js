/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Platform-wide stats dashboard
 *     responses:
 *       200:
 *         description: Stats object
 *
 * /admin/listings/pending:
 *   get:
 *     tags: [Admin]
 *     summary: List listings pending approval
 *     responses:
 *       200:
 *         description: Pending listing list
 *
 * /admin/listings/{id}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve a listing
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Listing approved
 *
 * /admin/listings/{id}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject a listing
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
 *         description: Listing rejected
 *
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit logs
 *     responses:
 *       200:
 *         description: Audit log list
 *
 * /admin/amenities:
 *   get:
 *     tags: [Admin]
 *     summary: List all amenities (public)
 *     security: []
 *     responses:
 *       200:
 *         description: Amenity list
 *   post:
 *     tags: [Admin]
 *     summary: Create a new amenity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:     { type: string }
 *               category: { type: string }
 *     responses:
 *       201:
 *         description: Amenity created
 *
 * /admin/amenities/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete an amenity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /admin/activity-highlights:
 *   get:
 *     tags: [Admin]
 *     summary: List activity highlight masters (public)
 *     description: Returns pre-seeded highlights. Filter by activityType to get relevant highlights for a listing.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *           enum: [trekking, water_sports, adventure, cultural, wildlife, cycling, camping, yoga_wellness, culinary, sightseeing]
 *     responses:
 *       200:
 *         description: List of highlights with id, name, description, icon
 *
 * /admin/cancellation-policies:
 *   get:
 *     tags: [Admin]
 *     summary: List cancellation policies (public)
 *     security: []
 *     responses:
 *       200:
 *         description: Policy list
 *   post:
 *     tags: [Admin]
 *     summary: Create a cancellation policy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, rulesJson]
 *             properties:
 *               name:     { type: string }
 *               rulesJson:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       201:
 *         description: Policy created
 */

const router = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('./admin.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin } = require('../../shared/middleware/auth');

// Public routes (no auth required)
router.get('/cancellation-policies',  ctrl.listPolicies);
router.get('/amenities',              ctrl.listAmenities);
router.get('/activity-highlights',    ctrl.listActivityHighlights);

// All routes below require admin authentication
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/stats', ctrl.stats);

// Listings moderation
router.get('/listings/pending',      ctrl.pendingListings);
router.post('/listings/:id/approve', ctrl.approveListing);
router.post('/listings/:id/reject',
  body('reason').optional().trim(),
  validate,
  ctrl.rejectListing
);

// Audit logs
router.get('/audit-logs', ctrl.auditLogs);

// Amenities management (GET is public — registered above auth middleware)
router.post('/amenities',
  body('name').notEmpty().trim(),
  body('category').optional().trim(),
  validate,
  ctrl.createAmenity
);
router.delete('/amenities/:id', ctrl.deleteAmenity);

// Cancellation policies (GET is public — registered above auth middleware)
router.post('/cancellation-policies',
  body('name').notEmpty(),
  body('rulesJson').isArray(),
  validate,
  ctrl.createPolicy
);

module.exports = router;
