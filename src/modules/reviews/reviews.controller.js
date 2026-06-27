const { Review, Booking, User } = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');

const listByListing = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Review.findAndCountAll({
      where: { listingId: req.params.listingId, isPublished: true },
      include: [{ model: User, as: 'user', attributes: ['fullName', 'avatarUrl'] }],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const submit = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const booking = await Booking.findOne({ where: { id: bookingId, userId: req.user.id } });
    if (!booking)              return R.notFound(res, 'Booking not found');
    if (booking.status !== 'completed') return R.error(res, 'Reviews can only be submitted for completed bookings');

    const [review] = await Review.upsert({ bookingId, userId: req.user.id, listingId: booking.listingId, rating, comment: comment || null });
    R.created(res, { review });
  } catch (err) { next(err); }
};

const vendorReply = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return R.notFound(res);
    await review.update({ vendorReply: req.body.vendorReply, repliedAt: new Date() });
    R.success(res, { review });
  } catch (err) { next(err); }
};

const publish   = async (req, res, next) => { try { await Review.update({ isPublished: true  }, { where: { id: req.params.id } }); R.success(res, { message: 'Published' }); } catch (err) { next(err); } };
const unpublish = async (req, res, next) => { try { await Review.update({ isPublished: false }, { where: { id: req.params.id } }); R.success(res, { message: 'Unpublished' }); } catch (err) { next(err); } };
const remove    = async (req, res, next) => { try { await Review.destroy({ where: { id: req.params.id } }); R.success(res, { message: 'Deleted' }); } catch (err) { next(err); } };

module.exports = { listByListing, submit, vendorReply, publish, unpublish, remove };
