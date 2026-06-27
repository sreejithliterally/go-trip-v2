const { sequelize, QueryTypes, RoomMealPlan, GlampingMealPlan, Coupon } = require('../../db/index');

/**
 * Fetch effective prices for an entity over a date range using v_effective_price.
 */
const getEffectivePrices = (entityType, entityId, checkIn, checkOut) =>
  sequelize.query(
    `SELECT date, effective_price
     FROM v_effective_price
     WHERE entity_type = :entityType
       AND entity_id   = :entityId
       AND date >= :checkIn
       AND date <  :checkOut
     ORDER BY date`,
    { type: QueryTypes.SELECT, replacements: { entityType, entityId, checkIn, checkOut } }
  );

/**
 * Sum per-meal per-person charges for a meal plan row.
 */
const getMealPlanCharges = async (mealPlanId, planType) => {
  const Model = planType === 'room' ? RoomMealPlan : GlampingMealPlan;
  const plan  = await Model.findByPk(mealPlanId, {
    attributes: ['breakfastPricePp', 'lunchPricePp', 'dinnerPricePp'],
  });
  if (!plan) return 0;
  return plan.breakfastPricePp + plan.lunchPricePp + plan.dinnerPricePp;
};

/**
 * Full server-side price breakdown.
 */
const calculateBookingPrice = async ({
  entityType, entityId, checkIn, checkOut,
  adults, infants = 0, unitsBooked = 1,
  defaultAdultOccupancy = 2, extraAdultCharge = 0,
  mealPlanId = null, mealPlanType = null,
  platformFeePct = 0,
}) => {
  if (entityType === 'activity_slot' || !checkOut) {
    const nextDay = new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0];
    const prices  = await getEffectivePrices(entityType, entityId, checkIn, nextDay);
    const dayPrice = prices[0]?.effective_price ?? 0;
    return buildBreakdown({ nights: null, basePrice: dayPrice * adults, extraPersonCharge: 0, mealCharge: 0, platformFeePct });
  }

  const prices = await getEffectivePrices(entityType, entityId, checkIn, checkOut);
  if (!prices.length) throw new Error('No availability prices found for date range');

  const nights      = prices.length;
  const basePrice   = prices.reduce((s, r) => s + Number(r.effective_price), 0) * unitsBooked;
  const extraAdults = Math.max(0, adults - defaultAdultOccupancy);
  const extraPersonCharge = extraAdultCharge * extraAdults * nights;

  let mealCharge = 0;
  if (mealPlanId && mealPlanType) {
    const ppPerMeal = await getMealPlanCharges(mealPlanId, mealPlanType);
    mealCharge = ppPerMeal * adults * nights;
  }

  return buildBreakdown({ nights, basePrice, extraPersonCharge, mealCharge, platformFeePct });
};

/**
 * Validate and resolve a coupon discount against a subtotal.
 */
const resolveCouponDiscount = async (couponId, subtotal, category) => {
  if (!couponId) return { discountAmount: 0, couponCode: null };

  const coupon = await Coupon.findOne({
    where: {
      id: couponId, isActive: true,
    },
  });
  if (!coupon) return { discountAmount: 0, couponCode: null };
  if (coupon.applicableCategories?.length && !coupon.applicableCategories.includes(category)) {
    return { discountAmount: 0, couponCode: null };
  }

  let discount = 0;
  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue;
  } else {
    discount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountCap) discount = Math.min(discount, coupon.maxDiscountCap);
  }

  return { discountAmount: Math.min(r2(discount), subtotal), couponCode: coupon.code, coupon };
};

const buildBreakdown = ({ nights, basePrice, extraPersonCharge, mealCharge, platformFeePct }) => {
  const subtotal      = r2(basePrice + extraPersonCharge + mealCharge);
  const taxableAmount = subtotal;
  const taxRatePct    = 18;
  const taxAmount     = r2(taxableAmount * taxRatePct / 100);
  const platformFee   = r2(subtotal * platformFeePct / 100);
  const totalAmount   = r2(taxableAmount + taxAmount + platformFee);
  return {
    nights, basePrice: r2(basePrice), extraPersonCharge: r2(extraPersonCharge),
    mealCharge: r2(mealCharge), subtotal, discountAmount: 0,
    taxableAmount, taxRatePct, taxAmount, platformFee,
    platformFeePct: Number(platformFeePct), totalAmount, currency: 'INR',
  };
};

const r2 = (n) => Math.round(Number(n) * 100) / 100;

module.exports = { calculateBookingPrice, getEffectivePrices, resolveCouponDiscount, getMealPlanCharges };
