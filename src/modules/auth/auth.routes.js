/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Initiate registration — validate details and send OTP
 *     description: |
 *       Step 1 of 2. Validates the supplied details, stores them temporarily, and
 *       sends a 6-digit OTP.
 *       - If **email** is provided the OTP is sent by email.
 *       - If only **phone** is provided the OTP is sent by SMS.
 *       At least one of `email` or `phone` is required.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             Email registration:
 *               value: { email: "user@example.com", fullName: "Jane Doe", password: "secret123", role: "user" }
 *             Phone registration:
 *               value: { phone: "+919876543210", fullName: "Jane Doe", password: "secret123" }
 *     responses:
 *       200:
 *         description: OTP dispatched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSentResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email or phone already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and create account
 *     description: |
 *       Step 2 of 2. Pass the same `email` or `phone` used in `/register` plus
 *       the 6-digit OTP the user received. On success the account is created and
 *       JWT tokens are returned immediately.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *           examples:
 *             Email OTP:
 *               value: { email: "user@example.com", otp: "482913" }
 *             Phone OTP:
 *               value: { phone: "+919876543210", otp: "382017" }
 *     responses:
 *       201:
 *         description: Account created — tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *
 * /auth/login/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send login OTP — step 1 of OTP login
 *     description: |
 *       Pass the **email** or **phone** the account was registered with.
 *       A 6-digit OTP is dispatched to that contact. Follow up with
 *       `POST /auth/login/verify-otp` to complete sign-in.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Provide email or phone (not both required)
 *             properties:
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *           examples:
 *             Email:
 *               value: { email: "user@example.com" }
 *             Phone:
 *               value: { phone: "+919876543210" }
 *     responses:
 *       200:
 *         description: OTP dispatched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSentResponse'
 *       404:
 *         description: No active account found for this contact
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/login/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify login OTP — step 2 of OTP login
 *     description: |
 *       Pass the same email or phone used in `send-otp` plus the 6-digit
 *       OTP. Returns JWT tokens on success.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *           examples:
 *             Email OTP:
 *               value: { email: "user@example.com", otp: "482913" }
 *             Phone OTP:
 *               value: { phone: "+919876543210", otp: "382017" }
 *     responses:
 *       200:
 *         description: Logged in — tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (authenticated)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword:     { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Current password incorrect
 */

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('./auth.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate } = require('../../shared/middleware/auth');

// POST /auth/register — validate & send OTP
router.post('/register',
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('fullName').notEmpty().trim(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['user', 'vendor']),
  validate,
  ctrl.register
);

// POST /auth/verify-otp — verify OTP and create account
router.post('/verify-otp',
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  validate,
  ctrl.verifyOtp
);

// POST /auth/login/send-otp — send OTP for OTP-based login
router.post('/login/send-otp',
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  validate,
  ctrl.sendLoginOtp
);

// POST /auth/login/verify-otp — verify OTP and issue tokens
router.post('/login/verify-otp',
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  validate,
  ctrl.verifyLoginOtp
);

router.post('/refresh',
  body('refreshToken').notEmpty(),
  validate,
  ctrl.refresh
);

router.get('/me', authenticate, ctrl.me);

router.post('/change-password',
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
  ctrl.changePassword
);

module.exports = router;
