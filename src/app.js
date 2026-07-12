require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');

const swaggerUi        = require('swagger-ui-express');
const { buildSpec }    = require('./shared/utils/swagger');
const isDev            = process.env.NODE_ENV !== 'production';
const _prodSwaggerSpec = isDev ? null : buildSpec();

const errorHandler  = require('./shared/middleware/errorHandler');
const logger        = require('./shared/utils/logger');

// Route modules
const authRoutes          = require('./modules/auth/auth.routes');
const userRoutes          = require('./modules/users/users.routes');
const vendorRoutes        = require('./modules/vendors/vendors.routes');
const hotelRoutes         = require('./modules/hotels/hotels.routes');
const glampingRoutes      = require('./modules/glamping/glamping.routes');
const activityRoutes      = require('./modules/activities/activities.routes');
const packageRoutes       = require('./modules/packages/packages.routes');
const availabilityRoutes  = require('./modules/availability/availability.routes');
const bookingRoutes       = require('./modules/bookings/bookings.routes');
const paymentRoutes       = require('./modules/payments/payments.routes');
const reviewRoutes        = require('./modules/reviews/reviews.routes');
const couponRoutes        = require('./modules/coupons/coupons.routes');
const notificationRoutes  = require('./modules/notifications/notifications.routes');
const adminRoutes         = require('./modules/admin/admin.routes');
const searchRoutes        = require('./modules/search/search.routes');

const app = express();

// ── Security & utility middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Rate limiting — global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      300,
  message:  { success: false, error: 'Too many requests, please try again later.' },
}));

// Stricter rate limit for auth
app.use('/api/v1/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, error: 'Too many auth attempts.' },
}));

// NOTE: Razorpay webhook needs raw body — mount BEFORE json parser
// (express.raw is applied in payments.routes.js for that specific route)
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Swagger UI ────────────────────────────────────────────────────────────────
// In dev the spec is rebuilt on every /docs.json request so changes to any
// route file are reflected without a server restart.
const getSpec = () => isDev ? buildSpec() : _prodSwaggerSpec;

app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, {
  customSiteTitle: 'GoTrip API Docs',
  swaggerOptions: { url: '/docs.json', persistAuthorization: true },
}));
app.get('/docs.json', (req, res) => res.json(getSpec()));

// ── API routes ────────────────────────────────────────────────────────────────
const v1 = '/api/v1';

app.use(`${v1}/auth`,              authRoutes);
app.use(`${v1}/users`,             userRoutes);
app.use(`${v1}/vendors`,           vendorRoutes);
app.use(`${v1}/hotels`,            hotelRoutes);
app.use(`${v1}/glamping`,          glampingRoutes);
app.use(`${v1}/activities`,        activityRoutes);
app.use(`${v1}/packages`,          packageRoutes);
app.use(`${v1}/availability`,      availabilityRoutes);
app.use(`${v1}/bookings`,          bookingRoutes);
app.use(`${v1}/payments`,          paymentRoutes);
app.use(`${v1}/reviews`,           reviewRoutes);
app.use(`${v1}/coupons`,           couponRoutes);
app.use(`${v1}/notifications`,     notificationRoutes);
app.use(`${v1}/admin`,             adminRoutes);
app.use(`${v1}/search`,            searchRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
