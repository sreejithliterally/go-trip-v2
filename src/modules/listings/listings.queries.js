const { VendorProfile, Listing, ListingImage } = require('../../db/index');

/**
 * Assert that a listing belongs to the authenticated vendor.
 * Throws 404 if not found or access denied.
 */
const assertVendorOwnsListing = async (listingId, vendorId) => {
  const listing = await Listing.findOne({ where: { id: listingId, vendorId } });
  if (!listing) throw Object.assign(new Error('Listing not found or access denied'), { status: 404 });
  return listing;
};

/**
 * Resolve the VendorProfile id for a given user id.
 * Throws 403 if no profile found.
 */
const getVendorProfileId = async (userId) => {
  const vp = await VendorProfile.findOne({ where: { userId } });
  if (!vp) throw Object.assign(new Error('Vendor profile not found'), { status: 403 });
  return vp.id;
};

/**
 * Add an image record for any entity.
 */
const addImage = ({ listingId, entityType, entityId, url, sortOrder = 0, isCover = false, altText = null }) =>
  ListingImage.create({ listingId, entityType, entityId, url, sortOrder, isCover, altText });

/**
 * Get all images for a given entity.
 */
const getImages = (entityType, entityId) =>
  ListingImage.findAll({ where: { entityType, entityId }, order: [['sort_order', 'ASC']] });

module.exports = { assertVendorOwnsListing, getVendorProfileId, addImage, getImages };
