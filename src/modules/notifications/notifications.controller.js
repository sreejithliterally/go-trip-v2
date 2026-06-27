const { Notification } = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Notification.findAndCountAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']], limit, offset,
    });
    const unreadCount = await Notification.count({ where: { userId: req.user.id, isRead: false } });
    R.paginated(res, { data: rows, total: count, limit, offset, unreadCount });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    await Notification.update({ isRead: true }, { where: { id: req.params.id, userId: req.user.id } });
    R.success(res, { message: 'Marked as read' });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id } });
    R.success(res, { message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

const createNotification = (userId, type, title, body, refType = null, refId = null) =>
  Notification.create({ userId, type, title, body, refType, refId });

module.exports = { list, markRead, markAllRead, createNotification };
