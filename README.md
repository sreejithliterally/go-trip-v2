# GoTrip v2 — Multi-Vendor Travel Booking API

A Node.js + Express backend for a multi-vendor travel booking platform supporting Hotels, Packages, Glamping, and Activities.

## Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Database**: PostgreSQL (via `pg`)
- **Auth**: JWT (access + refresh tokens)
- **Payments**: Razorpay
- **Storage**: AWS S3 (via `multer-s3`)
- **Logging**: Winston

---

## Quick Start

### 1. Clone & install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Set up database

```bash
# Apply main schema
psql -d gotripv2 -f booking_schema.sql

# Apply user credentials table + view + extra triggers
node src/db/migrate.js

# (Optional) Apply OTA sync schema for next phase
psql -d gotripv2 -f ota_channel_sync_schema.sql
```

### 4. Run

```bash
npm run dev      # Development (nodemon)
npm start        # Production
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register user/vendor |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET  | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/change-password` | Change password |

### Booking Flow (in order)
| Step | Method | Path |
|------|--------|------|
| 1 | POST | `/api/v1/bookings/check-availability` |
| 2 | POST | `/api/v1/bookings/hold` |
| 3 | POST | `/api/v1/payments/initiate` |
| 4 | Webhook | `/api/v1/payments/webhook/razorpay` |

### Hotels
- `GET /api/v1/hotels` — list with filters
- `GET /api/v1/hotels/:id` — detail with room types
- `POST /api/v1/hotels` — vendor: create hotel
- `POST /api/v1/hotels/:id/room-types` — add room type
- `POST /api/v1/hotels/:id/room-types/:rtId/meal-plans` — add meal plan

### Glamping
- `GET /api/v1/glamping` — list
- `POST /api/v1/glamping` — vendor: create site

### Activities
- `GET /api/v1/activities` — list
- `POST /api/v1/activities` — vendor: create
- `POST /api/v1/activities/:id/slots` — add slot

### Packages
- `GET /api/v1/packages` — list
- `POST /api/v1/packages/:id/enquiries` — submit enquiry

### Availability
- `GET /api/v1/availability/:entityType/:entityId?startDate=&endDate=`
- `PATCH /api/v1/availability/:entityType/:entityId/block`
- `PATCH /api/v1/availability/:entityType/:entityId/price-override`
- `POST /api/v1/availability/:entityType/:entityId/seasonal`

### Admin (`/api/v1/admin/`)
- `GET /stats` — dashboard stats
- `GET /listings/pending` — pending approvals
- `POST /listings/:id/approve`
- `GET /vendors` — all vendors (via vendor routes)

---

## Price Resolution Order

1. `availability_calendar.price_override` (day-level)
2. `seasonal_pricing` ordered by `priority DESC`
3. Base price on `room_types.base_price_per_night` or `glamping_sites.price_per_camp_night`

Use the `v_effective_price` view — never reimplement inline.

## Booking Price Formula

```
base_price = effective_price × nights × units_booked
extra_person_charge = extra_adult_charge × MAX(0, adults - default_adult_occupancy) × nights
meal_charge = (breakfast + lunch + dinner) per person × adults × nights
subtotal = base_price + extra_person_charge + meal_charge
discount = coupon logic
taxable_amount = subtotal - discount
tax_amount = taxable_amount × 18%  (GST)
platform_fee = subtotal × platform_fee_pct / 100
total = taxable_amount + tax_amount + platform_fee
```

---

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `user` | Browse listings, book, review, manage own bookings |
| `vendor` | CRUD own listings, manage own bookings, view payouts |
| `admin` | Full access, KYC approval, listing moderation |

---

## OTA Sync (Next Phase)

The sync worker (`src/modules/sync/sync.worker.js`) polls `sync_queue` with exponential backoff. Apply `ota_channel_sync_schema.sql` to enable.
