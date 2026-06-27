/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get my notifications
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Notification list
 *
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Marked as read
 *
 * /notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All marked as read
 */

const router = require('express').Router();
const ctrl   = require('./notifications.controller');
const { authenticate } = require('../../shared/middleware/auth');

router.use(authenticate);

router.get('/',              ctrl.list);
router.patch('/:id/read',    ctrl.markRead);
router.post('/read-all',     ctrl.markAllRead);

module.exports = router;
