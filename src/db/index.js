/**
 * Central database module.
 * Exports the Sequelize instance, QueryTypes, and every model.
 * All inter-model associations are defined here.
 */
const sequelize       = require('./connection');
const { QueryTypes }  = require('sequelize');

// ── Models ────────────────────────────────────────────────────────────────────
const User                = require('../models/User');
const UserCredential      = require('../models/UserCredential');
const VendorProfile       = require('../models/VendorProfile');
const AmenityMaster       = require('../models/AmenityMaster');
const CancellationPolicy  = require('../models/CancellationPolicy');
const Listing             = require('../models/Listing');
const ListingImage        = require('../models/ListingImage');
const ListingHighlight    = require('../models/ListingHighlight');
const HotelProperty       = require('../models/HotelProperty');
const RoomType            = require('../models/RoomType');
const RoomMealPlan        = require('../models/RoomMealPlan');
const RoomAmenity         = require('../models/RoomAmenity');
const Package             = require('../models/Package');
const PackageItinerary    = require('../models/PackageItinerary');
const Enquiry             = require('../models/Enquiry');
const GlampingSite        = require('../models/GlampingSite');
const GlampingMealPlan    = require('../models/GlampingMealPlan');
const Activity                  = require('../models/Activity');
const ActivitySlot              = require('../models/ActivitySlot');
const ActivityHighlightMaster   = require('../models/ActivityHighlightMaster');
const ActivityHighlight         = require('../models/ActivityHighlight');
const AvailabilityCalendar = require('../models/AvailabilityCalendar');
const SeasonalPricing     = require('../models/SeasonalPricing');
const Booking             = require('../models/Booking');
const BookingPricing      = require('../models/BookingPricing');
const BookingGuest        = require('../models/BookingGuest');
const Payment             = require('../models/Payment');
const Refund              = require('../models/Refund');
const VendorPayout        = require('../models/VendorPayout');
const Coupon              = require('../models/Coupon');
const CouponUsage         = require('../models/CouponUsage');
const Review              = require('../models/Review');
const Notification        = require('../models/Notification');
const AuditLog            = require('../models/AuditLog');

// ── Associations ──────────────────────────────────────────────────────────────

// User <-> UserCredential (1:1)
User.hasOne(UserCredential, { foreignKey: 'user_id', as: 'credential' });
UserCredential.belongsTo(User, { foreignKey: 'user_id' });

// User <-> VendorProfile (1:1)
User.hasOne(VendorProfile, { foreignKey: 'user_id', as: 'vendorProfile' });
VendorProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// VendorProfile <-> Listing (1:N)
VendorProfile.hasMany(Listing, { foreignKey: 'vendor_id', as: 'listings' });
Listing.belongsTo(VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });

// Listing <-> CancellationPolicy (N:1)
Listing.belongsTo(CancellationPolicy, { foreignKey: 'cancellation_policy_id', as: 'cancellationPolicy' });
CancellationPolicy.hasMany(Listing, { foreignKey: 'cancellation_policy_id' });

// Listing <-> ListingImage (1:N)
Listing.hasMany(ListingImage, { foreignKey: 'listing_id', as: 'images' });
ListingImage.belongsTo(Listing, { foreignKey: 'listing_id' });

// Listing <-> ListingHighlight (1:N)
Listing.hasMany(ListingHighlight, { foreignKey: 'listing_id', as: 'highlights' });
ListingHighlight.belongsTo(Listing, { foreignKey: 'listing_id' });

// Listing <-> HotelProperty (1:1)
Listing.hasOne(HotelProperty, { foreignKey: 'listing_id', as: 'hotelProperty' });
HotelProperty.belongsTo(Listing, { foreignKey: 'listing_id' });

// HotelProperty <-> RoomType (1:N)
HotelProperty.hasMany(RoomType, { foreignKey: 'hotel_property_id', as: 'roomTypes' });
RoomType.belongsTo(HotelProperty, { foreignKey: 'hotel_property_id' });

// RoomType <-> RoomMealPlan (1:N)
RoomType.hasMany(RoomMealPlan, { foreignKey: 'room_type_id', as: 'mealPlans' });
RoomMealPlan.belongsTo(RoomType, { foreignKey: 'room_type_id' });

// RoomType <-> AmenityMaster (M:N through RoomAmenity)
RoomType.belongsToMany(AmenityMaster, {
  through: RoomAmenity,
  foreignKey: 'room_type_id',
  otherKey:   'amenity_id',
  as: 'amenities',
});
AmenityMaster.belongsToMany(RoomType, {
  through: RoomAmenity,
  foreignKey: 'amenity_id',
  otherKey:   'room_type_id',
  as: 'roomTypes',
});

// Listing <-> GlampingSite (1:1)
Listing.hasOne(GlampingSite, { foreignKey: 'listing_id', as: 'glampingSite' });
GlampingSite.belongsTo(Listing, { foreignKey: 'listing_id' });

// GlampingSite <-> GlampingMealPlan (1:N)
GlampingSite.hasMany(GlampingMealPlan, { foreignKey: 'glamping_site_id', as: 'mealPlans' });
GlampingMealPlan.belongsTo(GlampingSite, { foreignKey: 'glamping_site_id' });

// Listing <-> Activity (1:1)
Listing.hasOne(Activity, { foreignKey: 'listing_id', as: 'activity' });
Activity.belongsTo(Listing, { foreignKey: 'listing_id' });

// Activity <-> ActivitySlot (1:N)
Activity.hasMany(ActivitySlot, { foreignKey: 'activity_id', as: 'slots' });
ActivitySlot.belongsTo(Activity, { foreignKey: 'activity_id' });

// Activity <-> ActivityHighlightMaster (M:N through ActivityHighlight)
Activity.belongsToMany(ActivityHighlightMaster, {
  through:    ActivityHighlight,
  foreignKey: 'activity_id',
  otherKey:   'highlight_master_id',
  as:         'highlights',
});
ActivityHighlightMaster.belongsToMany(Activity, {
  through:    ActivityHighlight,
  foreignKey: 'highlight_master_id',
  otherKey:   'activity_id',
  as:         'activities',
});

// Listing <-> Package (1:1)
Listing.hasOne(Package, { foreignKey: 'listing_id', as: 'package' });
Package.belongsTo(Listing, { foreignKey: 'listing_id' });

// Package <-> PackageItinerary (1:N)
Package.hasMany(PackageItinerary, { foreignKey: 'package_id', as: 'itineraries' });
PackageItinerary.belongsTo(Package, { foreignKey: 'package_id' });

// Listing / User <-> Enquiry
Listing.hasMany(Enquiry, { foreignKey: 'listing_id', as: 'enquiries' });
Enquiry.belongsTo(Listing, { foreignKey: 'listing_id' });
User.hasMany(Enquiry, { foreignKey: 'user_id', as: 'enquiries' });
Enquiry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Booking associations
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Listing.hasMany(Booking, { foreignKey: 'listing_id', as: 'bookings' });
Booking.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

VendorProfile.hasMany(Booking, { foreignKey: 'vendor_id', as: 'bookings' });
Booking.belongsTo(VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });

Booking.hasOne(BookingPricing, { foreignKey: 'booking_id', as: 'pricing' });
BookingPricing.belongsTo(Booking, { foreignKey: 'booking_id' });

Booking.hasMany(BookingGuest, { foreignKey: 'booking_id', as: 'guests' });
BookingGuest.belongsTo(Booking, { foreignKey: 'booking_id' });

Booking.hasMany(Payment, { foreignKey: 'booking_id', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id' });

Payment.hasMany(Refund, { foreignKey: 'payment_id', as: 'refunds' });
Refund.belongsTo(Payment, { foreignKey: 'payment_id' });
Refund.belongsTo(Booking, { foreignKey: 'booking_id' });

// VendorPayout
VendorProfile.hasMany(VendorPayout, { foreignKey: 'vendor_id', as: 'payouts' });
VendorPayout.belongsTo(VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
Booking.hasOne(VendorPayout, { foreignKey: 'booking_id', as: 'payout' });
VendorPayout.belongsTo(Booking, { foreignKey: 'booking_id' });

// Review
Booking.hasOne(Review, { foreignKey: 'booking_id', as: 'review' });
Review.belongsTo(Booking, { foreignKey: 'booking_id' });
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Listing.hasMany(Review, { foreignKey: 'listing_id', as: 'reviews' });
Review.belongsTo(Listing, { foreignKey: 'listing_id' });

// Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// Coupon <-> User (M:N through CouponUsage)
Coupon.hasMany(CouponUsage, { foreignKey: 'coupon_id', as: 'usages' });
CouponUsage.belongsTo(Coupon, { foreignKey: 'coupon_id' });
User.hasMany(CouponUsage, { foreignKey: 'user_id', as: 'couponUsages' });
CouponUsage.belongsTo(User, { foreignKey: 'user_id' });
Booking.hasOne(CouponUsage, { foreignKey: 'booking_id', as: 'couponUsage' });
CouponUsage.belongsTo(Booking, { foreignKey: 'booking_id' });

// AuditLog
User.hasMany(AuditLog, { foreignKey: 'actor_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  sequelize, QueryTypes,
  User, UserCredential, VendorProfile,
  AmenityMaster, CancellationPolicy,
  Listing, ListingImage, ListingHighlight,
  HotelProperty, RoomType, RoomMealPlan, RoomAmenity,
  GlampingSite, GlampingMealPlan,
  Activity, ActivitySlot, ActivityHighlightMaster, ActivityHighlight,
  Package, PackageItinerary, Enquiry,
  AvailabilityCalendar, SeasonalPricing,
  Booking, BookingPricing, BookingGuest,
  Payment, Refund, VendorPayout,
  Coupon, CouponUsage,
  Review, Notification, AuditLog,
};
