/**
 * @swagger
 * /reviews/listing/{listingId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews for a listing (public)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Review list
 *
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Submit a review for a completed booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, rating]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *               rating:    { type: integer, minimum: 1, maximum: 5 }
 *               comment:   { type: string }
 *     responses:
 *       201:
 *         description: Review submitted
 *
 * /reviews/{id}/reply:
 *   patch:
 *     tags: [Reviews]
 *     summary: Reply to a review (vendor)
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
 *             required: [vendorReply]
 *             properties:
 *               vendorReply: { type: string }
 *     responses:
 *       200:
 *         description: Reply saved
 *
 * /reviews/{id}/publish:
 *   patch:
 *     tags: [Reviews]
 *     summary: Publish a review (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Published
 *
 * /reviews/{id}/unpublish:
 *   patch:
 *     tags: [Reviews]
 *     summary: Unpublish a review (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unpublished
 *
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review (admin)
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
const { body } = require('express-validator');
const ctrl     = require('./reviews.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin, requireVendor } = require('../../shared/middleware/auth');

// Public
router.get('/listing/:listingId', ctrl.listByListing);

// Authenticated user: submit review
router.post('/',
  authenticate,
  body('bookingId').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim(),
  validate,
  ctrl.submit
);

// Vendor reply
router.patch('/:id/reply',
  authenticate, requireVendor,
  body('vendorReply').notEmpty().trim(),
  validate,
  ctrl.vendorReply
);

// Admin moderation
router.patch('/:id/publish',  authenticate, requireAdmin, ctrl.publish);
router.patch('/:id/unpublish',authenticate, requireAdmin, ctrl.unpublish);
router.delete('/:id',         authenticate, requireAdmin, ctrl.remove);

module.exports = router;
