const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title:       'GoTrip API',
      version:     '1.0.0',
      description: 'Multi-vendor travel booking platform — Hotels, Glamping, Activities, Packages',
    },
    servers: [
      { url: '/api/v1', description: 'Current environment' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {

        // ── Auth ──────────────────────────────────────────────────────
        RegisterRequest: {
          type: 'object',
          required: ['fullName', 'password'],
          description: 'Provide email, phone, or both. OTP is sent to email if present, otherwise SMS.',
          properties: {
            email:    { type: 'string', format: 'email', description: 'Required if phone is omitted' },
            phone:    { type: 'string', description: 'Required if email is omitted' },
            fullName: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role:     { type: 'string', enum: ['user', 'vendor'], default: 'user' },
          },
        },
        OtpSentResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'OTP sent to user@example.com' },
            channel: { type: 'string', enum: ['email', 'sms'] },
          },
        },
        VerifyOtpRequest: {
          type: 'object',
          required: ['otp'],
          description: 'Pass the same email or phone used in /register.',
          properties: {
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            otp:   { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success:      { type: 'boolean', example: true },
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id:       { type: 'string', format: 'uuid' },
                email:    { type: 'string' },
                phone:    { type: 'string' },
                fullName: { type: 'string' },
                role:     { type: 'string' },
              },
            },
          },
        },

        // ── Listing ───────────────────────────────────────────────────
        ListingBase: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            title:       { type: 'string' },
            description: { type: 'string' },
            category:    { type: 'string', enum: ['hotel', 'package', 'glamping', 'activity'] },
            status:      { type: 'string', enum: ['draft', 'pending_approval', 'active', 'suspended', 'archived'] },
            avgRating:   { type: 'number' },
            reviewCount: { type: 'integer' },
            locationJson: { type: 'object' },
          },
        },

        // ── Meal Plan (inline in room-type requests) ──────────────────
        MealPlanInput: {
          type: 'object',
          required: ['planCode'],
          description: 'Food cost is included in basePricePerNight. These flags tell guests what meals are covered.',
          properties: {
            planCode: {
              type: 'string',
              enum: ['EP', 'CP', 'MAP', 'AP', 'AI'],
              description: 'EP=Room Only · CP=Breakfast · MAP=Breakfast+Dinner · AP=All Meals · AI=All Inclusive',
            },
            label:             { type: 'string', description: 'Optional display name. Defaults to standard label if omitted.' },
            includesBreakfast: { type: 'boolean', default: false },
            includesLunch:     { type: 'boolean', default: false },
            includesDinner:    { type: 'boolean', default: false },
            includesSnacks:    { type: 'boolean', default: false },
            isDefault:         { type: 'boolean', default: false, description: 'Pre-selected plan shown to guest' },
          },
        },

        // ── Room Type ─────────────────────────────────────────────────
        RoomTypeRequest: {
          type: 'object',
          required: ['name', 'bedType', 'totalUnits', 'basePricePerNight'],
          properties: {
            name:                   { type: 'string', example: 'Deluxe King Room' },
            bedType:                { type: 'string', enum: ['single','double','queen','king','bunk','sofa_bed','twin'] },
            numBeds:                { type: 'integer', minimum: 1, default: 1 },
            floorAreaSqft:          { type: 'integer', minimum: 1 },
            totalUnits:             { type: 'integer', minimum: 1, description: 'Number of identical rooms of this type' },
            defaultAdultOccupancy:  { type: 'integer', minimum: 1, default: 2, description: 'Occupancy included at base price, no separate charge tier exists' },
            maxAdultOccupancy:      { type: 'integer', minimum: 1, default: 3, description: 'Hard cap — bookings requesting more adults than this are rejected (with room-combination suggestions)' },
            defaultChildOccupancy:  { type: 'integer', minimum: 0, default: 0, description: 'Children aged 2–12' },
            maxChildOccupancy:      { type: 'integer', minimum: 0, default: 2, description: 'Hard cap — bookings requesting more children than this are rejected (with room-combination suggestions)' },
            defaultInfantOccupancy: { type: 'integer', minimum: 0, default: 0, description: 'Infants under 2 (crib, no extra bed)' },
            maxInfantOccupancy:     { type: 'integer', minimum: 0, default: 2, description: 'Informational only — infants are never checked against this at booking time' },
            basePricePerNight:      { type: 'number', example: 2500, description: 'Flat price per night regardless of guest count, as long as within max occupancy' },
            amenityIds: {
              type: 'array',
              description: 'Optional. List of amenity UUIDs to attach. Can also be set/replaced later via PUT /room-types/:id/amenities.',
              items: { type: 'string', format: 'uuid' },
            },
            mealPlans: {
              type: 'array',
              description: 'Optional. Food cost is bundled into basePricePerNight — these flags just tell guests what is included. If omitted, all 5 standard plans are auto-seeded.',
              items: { '$ref': '#/components/schemas/MealPlanInput' },
              example: [
                { planCode: 'EP',  isDefault: true },
                { planCode: 'CP',  includesBreakfast: true },
                { planCode: 'MAP', includesBreakfast: true, includesDinner: true },
                { planCode: 'AP',  includesBreakfast: true, includesLunch: true, includesDinner: true },
                { planCode: 'AI',  includesBreakfast: true, includesLunch: true, includesDinner: true, includesSnacks: true },
              ],
            },
          },
        },

        // ── Booking ───────────────────────────────────────────────────
        BookingRequest: {
          type: 'object', required: ['listingId', 'entityType', 'entityId', 'checkIn', 'adults'],
          properties: {
            listingId:  { type: 'string', format: 'uuid' },
            entityType: { type: 'string', enum: ['room_type', 'full_property', 'glamping_site', 'activity_slot', 'package'] },
            entityId:   { type: 'string', format: 'uuid' },
            checkIn:    { type: 'string', format: 'date' },
            checkOut:   { type: 'string', format: 'date' },
            adults:     { type: 'integer', minimum: 1 },
            children:   { type: 'integer', minimum: 0, description: 'Ages 2-12. Counts against room maxChildOccupancy.' },
            infants:    { type: 'integer', minimum: 0, description: 'Under 2. Recorded only, never gates room capacity.' },
            unitsBooked: { type: 'integer', minimum: 1 },
            mealPlanId:  { type: 'string', format: 'uuid' },
            activitySlotId: { type: 'string', format: 'uuid', description: 'Required when entityType is activity_slot' },
            couponCode:  { type: 'string' },
            specialRequests: { type: 'string' },
            comboRef: { type: 'string', format: 'uuid', description: 'Links two bookings that together form one cross-room-type combination.' },
            guests: {
              type: 'array',
              description: 'Optional per-guest ID details, stored on the booking',
              items: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  age:      { type: 'integer' },
                  idType:   { type: 'string' },
                  idNumber: { type: 'string' },
                },
              },
            },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            bookingRef:  { type: 'string' },
            status:      { type: 'string' },
            checkIn:     { type: 'string', format: 'date' },
            checkOut:    { type: 'string', format: 'date' },
            adults:      { type: 'integer' },
            children:    { type: 'integer' },
            infants:     { type: 'integer' },
            unitsBooked: { type: 'integer' },
            comboRef:    { type: 'string', format: 'uuid', nullable: true },
          },
        },

        // ── Payment ───────────────────────────────────────────────────
        PaymentInitiateRequest: {
          type: 'object', required: ['bookingId'],
          properties: { bookingId: { type: 'string', format: 'uuid' } },
        },

        // ── Error ─────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error:   { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],

    tags: [
      { name: 'Auth',          description: 'Register, login, refresh tokens' },
      { name: 'Users',         description: 'User profile management' },
      { name: 'Vendors',       description: 'Vendor profile & KYC' },
      { name: 'Hotels',        description: 'Hotel listings & room types' },
      { name: 'Glamping',      description: 'Glamping site listings' },
      { name: 'Activities',    description: 'Activity listings & slots' },
      { name: 'Packages',      description: 'Travel package listings' },
      { name: 'Availability',  description: 'Calendar & pricing management' },
      { name: 'Bookings',      description: 'Booking lifecycle' },
      { name: 'Payments',      description: 'Razorpay integration & refunds' },
      { name: 'Reviews',       description: 'Review & rating system' },
      { name: 'Coupons',       description: 'Discount coupon management' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Admin',         description: 'Admin-only operations' },
    ],
  },
  // Scan all route files for JSDoc @swagger comments
  apis: [
    `${__dirname}/../../modules/**/*.routes.js`,
    `${__dirname}/swagger-docs/*.js`,
  ],
};

const buildSpec = () => swaggerJsdoc(options);

module.exports = { buildSpec };
