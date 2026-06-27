/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Create Razorpay order for a held booking (step 3)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiateRequest'
 *     responses:
 *       200:
 *         description: Razorpay order created
 *
 * /payments/webhook/razorpay:
 *   post:
 *     tags: [Payments]
 *     summary: Razorpay webhook receiver
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook processed
 *
 * /payments/refunds/{bookingId}:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate refund for a booking
 *     parameters:
 *       - in: path
 *         name: bookingId
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
 *       201:
 *         description: Refund initiated
 *
 * /payments/refunds:
 *   get:
 *     tags: [Payments]
 *     summary: List all refunds (admin)
 *     responses:
 *       200:
 *         description: Refund list
 *
 * /payments/payouts:
 *   get:
 *     tags: [Payments]
 *     summary: List my vendor payouts
 *     responses:
 *       200:
 *         description: Payout list
 *
 * /payments/payouts/all:
 *   get:
 *     tags: [Payments]
 *     summary: List all vendor payouts (admin)
 *     responses:
 *       200:
 *         description: All payouts
 *
 * /payments/payouts/{id}/settle:
 *   patch:
 *     tags: [Payments]
 *     summary: Mark a payout as settled (admin)
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
 *             required: [bankTransferRef]
 *             properties:
 *               bankTransferRef: { type: string }
 *     responses:
 *       200:
 *         description: Payout settled
 *
 * /payments/my:
 *   get:
 *     tags: [Payments]
 *     summary: My payment history
 *     responses:
 *       200:
 *         description: Payment list
 */

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('./payments.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin, requireVendor } = require('../../shared/middleware/auth');
const express  = require('express');

// Step 3: Initiate Razorpay order
router.post('/initiate',
  authenticate,
  body('bookingId').isUUID(),
  validate,
  ctrl.initiate
);

// Razorpay webhooks — raw body needed for signature verification
router.post(
  '/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  ctrl.razorpayWebhook
);

// Refunds
router.post('/refunds/:bookingId',
  authenticate,
  body('reason').optional().trim(),
  validate,
  ctrl.initiateRefund
);

router.get('/refunds',  authenticate, requireAdmin, ctrl.listRefunds);

// Vendor payouts
router.get('/payouts',  authenticate, requireVendor, ctrl.vendorPayouts);
router.get('/payouts/all', authenticate, requireAdmin, ctrl.adminPayouts);
router.patch('/payouts/:id/settle', authenticate, requireAdmin,
  body('bankTransferRef').notEmpty(),
  validate,
  ctrl.settleVendorPayout
);

// My payment history
router.get('/my', authenticate, ctrl.myPayments);

module.exports = router;
