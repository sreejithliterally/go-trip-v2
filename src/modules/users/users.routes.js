/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin)
 *     responses:
 *       200:
 *         description: User list
 *
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User detail
 *   patch:
 *     tags: [Users]
 *     summary: Update user (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate user (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deactivated
 *
 * /users/me/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update own profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone:    { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */

const router = require('express').Router();
const { body, query: qv } = require('express-validator');
const ctrl     = require('./users.controller');
const validate = require('../../shared/middleware/validate');
const { authenticate, requireAdmin } = require('../../shared/middleware/auth');

// All user routes require authentication
router.use(authenticate);

router.get('/',         requireAdmin, ctrl.list);
router.get('/:id',      requireAdmin, ctrl.get);
router.patch('/:id',    requireAdmin, ctrl.update);
router.delete('/:id',   requireAdmin, ctrl.deactivate);

// Self-service: update own profile
router.patch('/me/profile',
  body('fullName').optional().trim().notEmpty(),
  body('phone').optional().isMobilePhone(),
  validate,
  ctrl.updateProfile
);

module.exports = router;
