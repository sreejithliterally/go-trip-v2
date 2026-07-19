/**
 * @swagger
 * /coupons/validate:
 *   post:
 *     tags: [Coupons]
 *     summary: Validate a coupon code against a subtotal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, subtotal]
 *             properties:
 *               code:     { type: string }
 *               subtotal: { type: number }
 *     responses:
 *       200:
 *         description: Coupon valid with discount details
 *       400:
 *         description: Invalid or expired coupon
 *
 * /coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: List all coupons (admin)
 *     responses:
 *       200:
 *         description: Coupon list
 *   post:
 *     tags: [Coupons]
 *     summary: Create a coupon (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountType, discountValue, validFrom, validTo]
 *             properties:
 *               code:             { type: string }
 *               discountType:     { type: string, enum: [flat, percentage] }
 *               discountValue:    { type: number }
 *               maxDiscountCap:   { type: number, description: "Only applied to percentage discounts" }
 *               minBookingAmount: { type: number }
 *               validFrom:        { type: string, format: date }
 *               validTo:          { type: string, format: date }
 *               usageLimit:       { type: integer }
 *               applicableCategories:
 *                 type: array
 *                 items: { type: string, enum: [hotel, package, glamping, activity] }
 *     responses:
 *       201:
 *         description: Coupon created
 *
 * /coupons/{id}:
 *   patch:
 *     tags: [Coupons]
 *     summary: Update a coupon (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Coupons]
 *     summary: Delete a coupon (admin)
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
const ctrl     = require('./coupons.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin } = require('../../shared/middleware/auth');

// Public: validate coupon
router.post('/validate', authenticate,
  body('code').notEmpty(),
  body('subtotal').isDecimal(),
  validate,
  ctrl.validate
);

// Admin CRUD
router.get('/',     authenticate, requireAdmin, ctrl.list);
router.post('/',    authenticate, requireAdmin,
  body('code').notEmpty().trim(),
  body('discountType').isIn(['flat','percentage']),
  body('discountValue').isDecimal(),
  body('maxDiscountCap').optional().isDecimal(),
  body('minBookingAmount').optional().isDecimal(),
  body('validFrom').isISO8601(),
  body('validTo').isISO8601(),
  body('usageLimit').optional().isInt({ min: 1 }),
  body('applicableCategories').optional().isArray(),
  body('applicableCategories.*').optional().isIn(['hotel','package','glamping','activity']),
  validate,
  ctrl.create
);
router.patch('/:id',  authenticate, requireAdmin, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
