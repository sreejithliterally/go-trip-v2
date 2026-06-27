/**
 * @swagger
 * /vendors/profile:
 *   post:
 *     tags: [Vendors]
 *     summary: Create vendor profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, panNumber]
 *             properties:
 *               businessName: { type: string }
 *               panNumber:    { type: string }
 *               gstNumber:    { type: string }
 *     responses:
 *       201:
 *         description: Vendor profile created
 *
 * /vendors/profile/me:
 *   get:
 *     tags: [Vendors]
 *     summary: Get my vendor profile
 *     responses:
 *       200:
 *         description: Vendor profile
 *   patch:
 *     tags: [Vendors]
 *     summary: Update my vendor profile
 *     responses:
 *       200:
 *         description: Updated
 *
 * /vendors/profile/me/kyc:
 *   post:
 *     tags: [Vendors]
 *     summary: Upload KYC documents
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               docs:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: KYC docs uploaded
 *
 * /vendors/profile/me/bank:
 *   patch:
 *     tags: [Vendors]
 *     summary: Update bank account details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountNo, ifsc, bankName, holderName]
 *             properties:
 *               accountNo:   { type: string }
 *               ifsc:        { type: string }
 *               bankName:    { type: string }
 *               holderName:  { type: string }
 *     responses:
 *       200:
 *         description: Bank details updated
 *
 * /vendors:
 *   get:
 *     tags: [Vendors]
 *     summary: List all vendors (admin)
 *     responses:
 *       200:
 *         description: Vendor list
 *
 * /vendors/{id}:
 *   get:
 *     tags: [Vendors]
 *     summary: Get vendor by ID (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor detail
 *
 * /vendors/{id}/kyc-status:
 *   patch:
 *     tags: [Vendors]
 *     summary: Update vendor KYC status (admin)
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
 *               status: { type: string, enum: [approved, rejected, under_review] }
 *               note:   { type: string }
 *     responses:
 *       200:
 *         description: KYC status updated
 *
 * /vendors/{id}/commission:
 *   patch:
 *     tags: [Vendors]
 *     summary: Update vendor commission rate (admin)
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
 *             required: [commissionPct]
 *             properties:
 *               commissionPct: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Commission rate updated
 */

const router = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('./vendors.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin, requireVendor } = require('../../shared/middleware/auth');
const { uploadKyc } = require('../../shared/middleware/upload');

router.use(authenticate);

// Vendor self-registration of profile
router.post('/profile',
  body('businessName').notEmpty().trim(),
  body('panNumber').notEmpty().trim(),
  body('gstNumber').optional().trim(),
  validate,
  ctrl.createProfile
);

router.get('/profile/me',       requireVendor, ctrl.getMyProfile);
router.patch('/profile/me',     requireVendor, ctrl.updateProfile);

// KYC upload (vendor uploads docs)
router.post('/profile/me/kyc',  requireVendor, uploadKyc.array('docs', 5), ctrl.uploadKyc);

// Bank account (vendor only, never exposed to users)
router.patch('/profile/me/bank', requireVendor,
  body('accountNo').notEmpty(),
  body('ifsc').notEmpty(),
  body('bankName').notEmpty(),
  body('holderName').notEmpty(),
  validate,
  ctrl.updateBankAccount
);

// Admin-only
router.get('/',                  requireAdmin, ctrl.list);
router.get('/:id',               requireAdmin, ctrl.getById);
router.patch('/:id/kyc-status',  requireAdmin,
  body('status').isIn(['approved', 'rejected', 'under_review']),
  body('note').optional().trim(),
  validate,
  ctrl.updateKycStatus
);
router.patch('/:id/commission',  requireAdmin,
  body('commissionPct').isFloat({ min: 0, max: 100 }),
  validate,
  ctrl.updateCommission
);

module.exports = router;
