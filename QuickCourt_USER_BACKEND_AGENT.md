# QuickCourt --- User Backend Implementation Specification

## 0. Mission

Build **ONLY the User-side backend** for the QuickCourt sports-booking
application.

This document is the **single source of truth** for the AI coding agent.
The agent must use this specification as the implementation contract and
must not invent user-facing features outside this scope.

The backend must support:

-   User registration
-   OTP verification after registration
-   User login/logout
-   Authenticated user profile management
-   Approved venue discovery
-   Venue search/filter/pagination
-   Venue detail retrieval
-   Court and time-slot availability
-   Booking creation
-   Simulated payment confirmation
-   User booking history
-   Booking detail retrieval
-   Booking cancellation
-   Booking status handling
-   Basic validation, authorization, error handling, logging, and tests

Do **NOT** implement:

-   Facility-owner dashboard
-   Facility-owner facility creation/edit/delete
-   Facility-owner court management
-   Facility-owner availability management
-   Admin dashboard
-   Admin user management
-   Admin facility approval
-   Admin reports/moderation
-   Real payment gateway integration
-   Match creation/joining unless explicitly requested later
-   Chat/social features
-   Notifications beyond the minimum needed for OTP/booking confirmation

------------------------------------------------------------------------

# 1. Product Context

QuickCourt allows sports enthusiasts to discover approved local sports
venues, select a court/time slot, simulate payment, and manage their
bookings.

There are three roles in the complete product:

1.  `USER`
2.  `FACILITY_OWNER`
3.  `ADMIN`

This backend owns **only the USER experience**.

The user journey is:

``` text
Signup
  ↓
OTP verification
  ↓
Login
  ↓
Home / Venue discovery
  ↓
Search / Filter / Pagination
  ↓
Venue details
  ↓
Select court
  ↓
Select date + time slot
  ↓
Check availability
  ↓
Create booking
  ↓
Simulated payment
  ↓
Booking confirmed
  ↓
My Bookings
  ↓
View booking / Cancel booking
```

------------------------------------------------------------------------

# 2. Required Technology Stack

Use the following stack unless the existing repository already has an
established equivalent that must be preserved.

### Runtime

-   Node.js
-   TypeScript

### Backend

-   Express.js
-   REST API
-   JSON request/response format

### Database

-   MongoDB
-   Mongoose

### Authentication

-   JWT access token
-   bcrypt/bcryptjs for password hashing
-   OTP verification for signup

### Validation

-   Zod preferred
-   If the existing repository already uses Joi/express-validator,
    preserve the existing convention

### Security

-   Helmet
-   CORS
-   Rate limiting on authentication/OTP endpoints
-   Secure password hashing
-   Never return password hashes
-   Never expose OTP in production responses

### Email

Use Nodemailer or the repository's existing email provider abstraction.

Development mode may use a safe mock OTP strategy controlled by
environment configuration.

### Testing

-   Jest + Supertest, or the repository's existing testing framework
-   Unit tests for core business logic
-   Integration/API tests for all important endpoints

------------------------------------------------------------------------

# 3. Non-Negotiable Engineering Rules

The AI agent MUST follow these rules.

## 3.1 Do not modify unrelated modules

Only create/modify code required for:

-   User authentication
-   User profile
-   User venue browsing
-   User availability
-   User booking
-   User payment simulation
-   User bookings

Do not rewrite owner/admin modules.

## 3.2 Do not trust client-provided user identity

Never accept:

``` json
{
  "userId": "..."
}
```

as the source of truth for ownership.

The authenticated user must be obtained from the JWT:

``` text
req.user.id
```

A user can only access or mutate their own profile and bookings.

## 3.3 Never store plaintext passwords

Passwords must be hashed using bcrypt.

## 3.4 Never expose password hashes

User responses must never contain:

``` text
password
passwordHash
otp
otpHash
resetToken
```

## 3.5 Booking correctness is critical

Two users must not be able to successfully book the same court/time
slot.

The backend must enforce this at the database/business-logic level, not
only through frontend checks.

## 3.6 Payment is simulated

The requirement explicitly says:

> "Proceed to confirm and simulate payment"

Therefore, do NOT integrate Razorpay, Stripe, PayPal, etc.

Implement a deterministic simulated payment flow.

## 3.7 Approved venues only

The user-facing venue APIs must only expose facilities whose owner/admin
workflow has marked them as approved.

The user backend must never allow a normal user to create or approve a
facility.

------------------------------------------------------------------------

# 4. Recommended Project Structure

Use a modular structure.

``` text
src/
├── app.ts
├── server.ts
│
├── config/
│   ├── env.ts
│   └── database.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.validation.ts
│   │   └── auth.types.ts
│   │
│   ├── users/
│   │   ├── user.model.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.routes.ts
│   │   └── user.validation.ts
│   │
│   ├── venues/
│   │   ├── facility.model.ts
│   │   ├── court.model.ts
│   │   ├── venue.controller.ts
│   │   ├── venue.service.ts
│   │   ├── venue.routes.ts
│   │   └── venue.validation.ts
│   │
│   ├── bookings/
│   │   ├── booking.model.ts
│   │   ├── booking.controller.ts
│   │   ├── booking.service.ts
│   │   ├── booking.routes.ts
│   │   └── booking.validation.ts
│   │
│   └── payments/
│       ├── payment.service.ts
│       └── payment.types.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── notFound.middleware.ts
│   └── rateLimit.middleware.ts
│
├── utils/
│   ├── jwt.ts
│   ├── password.ts
│   ├── otp.ts
│   ├── email.ts
│   ├── apiResponse.ts
│   └── errors.ts
│
├── types/
│   └── express.d.ts
│
└── tests/
    ├── auth.test.ts
    ├── user.test.ts
    ├── venue.test.ts
    └── booking.test.ts
```

If the existing repository uses JavaScript instead of TypeScript,
preserve the repository's language rather than converting the entire
project.

------------------------------------------------------------------------

# 5. Environment Variables

Create `.env.example`.

``` env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb://localhost:27017/quickcourt

JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12

OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

EMAIL_FROM=no-reply@quickcourt.local
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

DEV_OTP_ENABLED=true
DEV_OTP=123456

CLIENT_URL=http://localhost:5173
```

Never commit `.env`.

------------------------------------------------------------------------

# 6. User Data Model

## User

``` text
User
├── _id
├── email
├── passwordHash
├── fullName
├── avatar
├── role
├── isEmailVerified
├── isActive
├── createdAt
└── updatedAt
```

### Fields

  Field               Type            Required Notes
  ------------------- ------------- ---------- -------------------
  `_id`               ObjectId             yes MongoDB ID
  `email`             string               yes unique, lowercase
  `passwordHash`      string               yes bcrypt hash
  `fullName`          string               yes 2--100 chars
  `avatar`            string/null           no URL
  `role`              enum                 yes `USER`
  `isEmailVerified`   boolean              yes default false
  `isActive`          boolean              yes default true
  `createdAt`         Date                 yes timestamps
  `updatedAt`         Date                 yes timestamps

The signup endpoint may technically accept a role because the original
specification mentions role during signup, but **normal public signup
must only permit `USER`**.

Never allow:

``` json
{
  "role": "ADMIN"
}
```

or:

``` json
{
  "role": "FACILITY_OWNER"
}
```

from a normal public signup request.

------------------------------------------------------------------------

# 7. OTP Model

Create a separate OTP collection.

``` text
OtpVerification
├── _id
├── email
├── otpHash
├── purpose
├── expiresAt
├── attempts
├── verified
├── createdAt
└── updatedAt
```

Purpose:

``` text
SIGNUP
```

Recommended indexes:

``` text
email + purpose
expiresAt (TTL)
```

Store a hash of the OTP rather than plaintext where practical.

For development:

``` env
DEV_OTP_ENABLED=true
DEV_OTP=123456
```

This is allowed only in development.

Production responses must never reveal the OTP.

------------------------------------------------------------------------

# 8. Venue / Facility Read Model

The owner/admin side owns creation and approval.

The user backend only needs to READ approved venue data.

A facility is conceptually:

``` text
Facility
├── _id
├── ownerId
├── name
├── description
├── location
├── sports
├── amenities
├── photos
├── rating
├── reviewCount
├── approvalStatus
├── isActive
├── createdAt
└── updatedAt
```

Required approval states:

``` text
PENDING
APPROVED
REJECTED
```

User APIs must query:

``` text
approvalStatus = APPROVED
isActive = true
```

unless an explicit integration contract says otherwise.

------------------------------------------------------------------------

# 9. Court Read Model

A facility contains courts.

Conceptually:

``` text
Court
├── _id
├── facilityId
├── name
├── sportType
├── pricePerHour
├── operatingHours
├── isActive
└── createdAt
```

Example:

``` json
{
  "_id": "court123",
  "facilityId": "facility123",
  "name": "Court 1",
  "sportType": "BADMINTON",
  "pricePerHour": 500,
  "operatingHours": {
    "open": "06:00",
    "close": "22:00"
  },
  "isActive": true
}
```

The user backend should not mutate courts.

------------------------------------------------------------------------

# 10. Booking Data Model

Booking is the most important model.

``` text
Booking
├── _id
├── userId
├── facilityId
├── courtId
├── sportType
├── bookingDate
├── startTime
├── endTime
├── amount
├── paymentStatus
├── bookingStatus
├── paymentReference
├── cancelledAt
├── cancellationReason
├── createdAt
└── updatedAt
```

### Booking status

``` text
CONFIRMED
CANCELLED
COMPLETED
```

### Payment status

``` text
PENDING
SUCCESS
FAILED
REFUNDED
```

### Required indexes

At minimum:

``` text
userId + bookingDate
facilityId + bookingDate
courtId + bookingDate + startTime + endTime
```

The implementation must also enforce slot uniqueness safely.

------------------------------------------------------------------------

# 11. Time Slot Representation

Use a consistent time representation.

Recommended:

``` text
bookingDate = YYYY-MM-DD
startTime = HH:mm
endTime = HH:mm
```

Example:

``` json
{
  "bookingDate": "2026-08-25",
  "startTime": "18:00",
  "endTime": "19:00"
}
```

Do not mix:

``` text
18:00
6 PM
18.00
18:00:00
```

internally.

Normalize all incoming times.

The system timezone should be explicitly configured. For the Indian
deployment:

``` text
Asia/Kolkata
```

Do not rely blindly on the server's local timezone.

------------------------------------------------------------------------

# 12. Booking Slot Rules

For MVP:

-   Booking duration is one hour.
-   User selects a date.
-   User selects a start time.
-   Backend calculates/validates the corresponding end time.
-   Slot must be inside court operating hours.
-   Slot must not overlap a blocked/unavailable period if the owner
    module exposes such data.
-   Slot must not overlap an existing confirmed booking.

Example:

``` text
18:00–19:00
```

is valid.

If another booking exists:

``` text
18:00–19:00
```

the user must receive a conflict.

If the system later supports arbitrary durations, overlap detection must
follow:

``` text
existingStart < requestedEnd
AND
existingEnd > requestedStart
```

------------------------------------------------------------------------

# 13. API Base URL

Use:

``` text
/api/v1
```

Authentication:

``` text
Authorization: Bearer <JWT>
```

------------------------------------------------------------------------

# 14. Authentication API

## 14.1 Register

``` http
POST /api/v1/auth/register
```

Request:

``` json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "fullName": "John Doe",
  "avatar": null
}
```

Validation:

-   email must be valid
-   password minimum 8 characters
-   password should contain reasonable complexity
-   full name required
-   email normalized to lowercase
-   duplicate email rejected

Response:

``` json
{
  "success": true,
  "message": "Registration successful. Verify your email with the OTP.",
  "data": {
    "email": "user@example.com",
    "requiresOtpVerification": true
  }
}
```

Do not return password.

Do not automatically authenticate until OTP verification succeeds.

------------------------------------------------------------------------

# 15. Verify OTP

``` http
POST /api/v1/auth/verify-otp
```

Request:

``` json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

On success:

-   mark user as verified
-   invalidate OTP
-   optionally issue JWT
-   return safe user information

Response:

``` json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatar": null,
      "role": "USER"
    },
    "token": "..."
  }
}
```

------------------------------------------------------------------------

# 16. Resend OTP

``` http
POST /api/v1/auth/resend-otp
```

Request:

``` json
{
  "email": "user@example.com"
}
```

Rules:

-   rate limit
-   invalidate previous active OTP
-   create a new OTP
-   send it
-   never expose it in production

------------------------------------------------------------------------

# 17. Login

``` http
POST /api/v1/auth/login
```

Request:

``` json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Rules:

-   verify email/password
-   reject inactive user
-   reject unverified user
-   issue JWT

Response:

``` json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "email": "...",
      "fullName": "...",
      "avatar": null,
      "role": "USER"
    }
  }
}
```

------------------------------------------------------------------------

# 18. Get Current User

``` http
GET /api/v1/auth/me
```

Authentication required.

Response:

``` json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "fullName": "...",
    "avatar": null,
    "role": "USER"
  }
}
```

------------------------------------------------------------------------

# 19. Logout

For JWT-only authentication, logout is fundamentally client-side unless
token revocation is implemented.

MVP:

``` http
POST /api/v1/auth/logout
```

Return:

``` json
{
  "success": true,
  "message": "Logged out successfully."
}
```

The frontend removes the token.

Do not falsely claim that a stateless JWT has been invalidated unless a
token blacklist/session mechanism exists.

------------------------------------------------------------------------

# 20. User Profile API

## Get Profile

``` http
GET /api/v1/users/me
```

Auth required.

Response:

``` json
{
  "success": true,
  "data": {
    "id": "...",
    "fullName": "...",
    "email": "...",
    "avatar": "...",
    "role": "USER"
  }
}
```

## Update Profile

``` http
PATCH /api/v1/users/me
```

Request:

``` json
{
  "fullName": "Updated Name",
  "avatar": "https://example.com/avatar.jpg"
}
```

Do not allow:

``` text
role
isActive
isEmailVerified
passwordHash
```

to be changed through this endpoint.

------------------------------------------------------------------------

# 21. Venue Listing API

The home page needs:

-   popular venues
-   popular sports

The venues page needs:

-   all approved venues
-   search
-   filters
-   pagination

## Endpoint

``` http
GET /api/v1/venues
```

Query parameters:

``` text
search
sport
minPrice
maxPrice
venueType
rating
page
limit
sort
```

Example:

``` http
GET /api/v1/venues?search=smash&sport=BADMINTON&minPrice=200&maxPrice=800&rating=4&page=1&limit=10
```

Rules:

-   only approved active facilities
-   search by venue name/location where useful
-   sport filter
-   price filter
-   rating filter
-   pagination
-   stable sorting

Default:

``` text
page = 1
limit = 10
```

Maximum:

``` text
limit = 50
```

Response:

``` json
{
  "success": true,
  "data": {
    "venues": [
      {
        "id": "...",
        "name": "Smash Arena",
        "sports": ["BADMINTON"],
        "startingPrice": 400,
        "location": "Indiranagar",
        "rating": 4.5,
        "reviewCount": 120,
        "thumbnail": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

Do not return unnecessary owner/private data.

------------------------------------------------------------------------

# 22. Popular Venues

``` http
GET /api/v1/venues/popular
```

Popularity may initially be calculated using:

``` text
booking count
+
rating
+
recent activity
```

However, do not create an overcomplicated recommendation system.

MVP implementation:

``` text
sort by bookingCount DESC
then rating DESC
```

If bookingCount is not available in the facility model, use
rating/reviewCount or another existing field.

Do not fabricate analytics fields without documenting them.

------------------------------------------------------------------------

# 23. Popular Sports

``` http
GET /api/v1/venues/popular-sports
```

Return something like:

``` json
{
  "success": true,
  "data": [
    {
      "sport": "BADMINTON",
      "venueCount": 15
    },
    {
      "sport": "FOOTBALL",
      "venueCount": 10
    }
  ]
}
```

Calculate only from approved active venues.

------------------------------------------------------------------------

# 24. Single Venue API

``` http
GET /api/v1/venues/:venueId
```

Response:

``` json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Smash Arena",
    "description": "...",
    "address": "...",
    "location": "...",
    "sports": ["BADMINTON"],
    "amenities": [
      "Parking",
      "Changing Room"
    ],
    "photos": [],
    "rating": 4.5,
    "reviewCount": 120,
    "courts": [
      {
        "id": "...",
        "name": "Court 1",
        "sportType": "BADMINTON",
        "pricePerHour": 500
      }
    ],
    "reviews": []
  }
}
```

The venue page requires:

-   name
-   description
-   address
-   sports
-   amenities
-   about venue
-   photo gallery
-   reviews
-   booking action

Reviews are optional according to the project specification.

Therefore:

-   If the team implements reviews, expose them.
-   If not implemented, return an empty array or omit the feature
    according to the frontend contract.

Do not invent a full review system unless explicitly requested.

------------------------------------------------------------------------

# 25. Court Availability API

This is required for the booking page.

``` http
GET /api/v1/venues/:venueId/courts/:courtId/availability
```

Query:

``` text
date=2026-08-25
```

Response:

``` json
{
  "success": true,
  "data": {
    "venueId": "...",
    "courtId": "...",
    "date": "2026-08-25",
    "slots": [
      {
        "startTime": "06:00",
        "endTime": "07:00",
        "price": 500,
        "available": true
      },
      {
        "startTime": "07:00",
        "endTime": "08:00",
        "price": 500,
        "available": false
      }
    ]
  }
}
```

The backend must derive availability from:

1.  court operating hours
2.  owner-configured blocked slots, if available
3.  confirmed bookings
4.  current date/time

Do not trust frontend availability.

------------------------------------------------------------------------

# 26. Availability Rules

Reject:

-   past dates
-   invalid dates
-   inactive courts
-   courts belonging to another facility
-   non-approved facilities

For today:

-   slots whose start time has already passed must not be bookable.

Example:

``` text
Current time: 18:30

18:00–19:00 → unavailable
19:00–20:00 → available
```

Use the configured timezone.

------------------------------------------------------------------------

# 27. Booking API

## Create Booking

``` http
POST /api/v1/bookings
```

Authentication required.

Request:

``` json
{
  "facilityId": "...",
  "courtId": "...",
  "bookingDate": "2026-08-25",
  "startTime": "18:00"
}
```

The backend determines:

``` text
endTime = 19:00
amount = court.pricePerHour
userId = req.user.id
```

Do NOT accept the final amount from the frontend as authoritative.

If the frontend sends:

``` json
{
  "amount": 1
}
```

ignore it and calculate the actual price from the database.

------------------------------------------------------------------------

# 28. Booking Creation Flow

Implement the following sequence:

``` text
1. Authenticate user
2. Validate facilityId
3. Validate courtId
4. Verify facility exists
5. Verify facility is APPROVED + active
6. Verify court exists
7. Verify court belongs to facility
8. Verify court is active
9. Validate date
10. Validate time
11. Validate operating hours
12. Check owner-defined blocked slots if available
13. Check existing bookings
14. Calculate price from court
15. Create pending booking
16. Simulate payment
17. If payment succeeds:
      mark payment SUCCESS
      mark booking CONFIRMED
18. If payment fails:
      mark payment FAILED
      do not leave a confirmed booking
19. Return booking
```

------------------------------------------------------------------------

# 29. Prevent Double Booking

This is mandatory.

A frontend check like:

``` text
if (available) book()
```

is NOT enough.

Two requests can arrive simultaneously.

The backend must protect against:

``` text
User A → checks slot → available
User B → checks slot → available
User A → books
User B → books
```

Only one must succeed.

Recommended approach:

### Approach A --- unique slot document

For fixed one-hour slots, model each slot as a unique resource:

``` text
courtId + bookingDate + startTime
```

and enforce a unique database index.

### Approach B --- transaction + conflict check

Use a MongoDB transaction and enforce a unique constraint where
possible.

The final implementation must be concurrency-safe.

If using transactions, verify MongoDB deployment supports transactions.

Do not merely rely on:

``` js
findOne()
then
create()
```

without a database-level safety mechanism.

------------------------------------------------------------------------

# 30. Simulated Payment

Create a payment service abstraction.

``` text
PaymentService
├── createPayment()
└── processPayment()
```

For MVP:

``` text
90–95% success
```

is unnecessary randomness. Prefer deterministic development behavior.

Recommended:

``` json
{
  "paymentMethod": "SIMULATED"
}
```

and return success unless explicitly configured to simulate failure.

Example:

``` json
{
  "paymentId": "SIM-ABC123",
  "status": "SUCCESS"
}
```

The payment reference must be stored in the booking.

------------------------------------------------------------------------

# 31. Booking Response

Example:

``` json
{
  "success": true,
  "message": "Booking confirmed successfully.",
  "data": {
    "id": "...",
    "facility": {
      "id": "...",
      "name": "Smash Arena"
    },
    "court": {
      "id": "...",
      "name": "Court 1"
    },
    "sportType": "BADMINTON",
    "bookingDate": "2026-08-25",
    "startTime": "18:00",
    "endTime": "19:00",
    "amount": 500,
    "paymentStatus": "SUCCESS",
    "bookingStatus": "CONFIRMED",
    "paymentReference": "SIM-ABC123"
  }
}
```

------------------------------------------------------------------------

# 32. My Bookings API

``` http
GET /api/v1/bookings
```

Authentication required.

Query:

``` text
status
fromDate
toDate
page
limit
```

Examples:

``` http
GET /api/v1/bookings
```

``` http
GET /api/v1/bookings?status=CONFIRMED
```

``` http
GET /api/v1/bookings?fromDate=2026-08-01&toDate=2026-08-31
```

Response:

``` json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "...",
        "venueName": "Smash Arena",
        "sportType": "BADMINTON",
        "courtName": "Court 1",
        "bookingDate": "2026-08-25",
        "startTime": "18:00",
        "endTime": "19:00",
        "status": "CONFIRMED",
        "amount": 500
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 4,
      "totalPages": 1
    }
  }
}
```

The user must only receive their own bookings.

------------------------------------------------------------------------

# 33. Booking Detail

``` http
GET /api/v1/bookings/:bookingId
```

Authentication required.

Rules:

``` text
booking.userId === req.user.id
```

Otherwise:

``` text
403 Forbidden
```

or:

``` text
404 Not Found
```

Prefer `404` where appropriate to avoid leaking existence of another
user's booking.

------------------------------------------------------------------------

# 34. Cancel Booking

``` http
PATCH /api/v1/bookings/:bookingId/cancel
```

Authentication required.

Request:

``` json
{
  "reason": "Unable to attend"
}
```

Rules:

-   only booking owner can cancel
-   cannot cancel already cancelled booking
-   cannot cancel completed booking
-   cancellation window must be defined

For MVP, use:

``` text
Cancellation allowed until the booking start time.
```

If:

``` text
currentTime >= booking.startTime
```

reject cancellation.

On cancellation:

``` text
bookingStatus = CANCELLED
paymentStatus = REFUNDED
cancelledAt = current time
cancellationReason = provided reason
```

Because payment is simulated, the refund is also simulated.

------------------------------------------------------------------------

# 35. Booking Status Handling

The system must support:

``` text
CONFIRMED
CANCELLED
COMPLETED
```

A scheduled job is optional for MVP.

If no scheduler is implemented, do not falsely claim that completed
status is automatically updated.

A booking can be considered completed dynamically when:

``` text
currentTime > endTime
```

but if persistent `COMPLETED` status is required, implement a small
scheduled job later.

For MVP, a safe approach is:

-   store `CONFIRMED`
-   expose derived display status `COMPLETED` when end time has passed
-   keep cancellation rules based on actual time

Document this behavior clearly.

------------------------------------------------------------------------

# 36. Home Page Backend Requirements

The frontend needs:

### Welcome banner / carousel

This can be static frontend data.

Do not create a CMS backend unless required.

### Popular venues

Use:

``` http
GET /api/v1/venues/popular
```

### Popular sports

Use:

``` http
GET /api/v1/venues/popular-sports
```

------------------------------------------------------------------------

# 37. Error Response Contract

Every error should follow one structure.

Example:

``` json
{
  "success": false,
  "message": "Court is already booked for this time slot.",
  "errorCode": "SLOT_UNAVAILABLE"
}
```

Validation error:

``` json
{
  "success": false,
  "message": "Validation failed.",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address."
    }
  ]
}
```

Use appropriate HTTP statuses.

``` text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

------------------------------------------------------------------------

# 38. Error Codes

Use stable error codes.

Recommended:

``` text
VALIDATION_ERROR
INVALID_CREDENTIALS
EMAIL_NOT_VERIFIED
EMAIL_ALREADY_EXISTS
INVALID_OTP
OTP_EXPIRED
OTP_RATE_LIMITED
USER_NOT_FOUND
USER_INACTIVE
VENUE_NOT_FOUND
VENUE_NOT_APPROVED
COURT_NOT_FOUND
COURT_INACTIVE
INVALID_BOOKING_DATE
INVALID_BOOKING_TIME
SLOT_UNAVAILABLE
BOOKING_NOT_FOUND
BOOKING_ALREADY_CANCELLED
BOOKING_ALREADY_COMPLETED
CANCELLATION_NOT_ALLOWED
PAYMENT_FAILED
UNAUTHORIZED
FORBIDDEN
INTERNAL_SERVER_ERROR
```

------------------------------------------------------------------------

# 39. Authentication Middleware

JWT payload:

``` json
{
  "sub": "userObjectId",
  "role": "USER"
}
```

Middleware:

``` text
Authorization header
        ↓
Bearer token extraction
        ↓
JWT verification
        ↓
User ID extraction
        ↓
Optional user lookup
        ↓
req.user
```

Protected routes:

``` text
GET /auth/me
GET /users/me
PATCH /users/me
GET /bookings
GET /bookings/:id
POST /bookings
PATCH /bookings/:id/cancel
GET /venues/.../availability
```

Venue listing/detail routes may remain public unless the team explicitly
decides otherwise.

------------------------------------------------------------------------

# 40. Authorization

The User backend must enforce:

``` text
role === USER
```

for user-specific operations.

Even if a valid JWT contains:

``` text
role = ADMIN
```

the user module must not accidentally expose owner/admin mutation
functionality.

The public user registration endpoint must never allow role escalation.

------------------------------------------------------------------------

# 41. Input Validation

Validate every request.

### Email

``` text
valid email
lowercase
trim
```

### Password

Minimum:

``` text
8 characters
```

### Full name

``` text
2–100 characters
```

### ObjectId

Reject malformed IDs before querying.

### Date

Must be:

``` text
YYYY-MM-DD
```

### Time

Must be:

``` text
HH:mm
```

### Price filters

Must be:

``` text
>= 0
```

### Pagination

``` text
page >= 1
limit between 1 and 50
```

------------------------------------------------------------------------

# 42. Security Requirements

Implement:

-   Helmet
-   CORS
-   rate limiting
-   request body size limit
-   secure password hashing
-   JWT secret from environment
-   sanitized errors
-   no stack traces in production
-   no password/OTP leakage
-   no raw database errors to client

Authentication rate limiting:

``` text
login
register
verify-otp
resend-otp
```

must be protected more aggressively than normal GET requests.

------------------------------------------------------------------------

# 43. Database Indexing

At minimum:

### User

``` text
email UNIQUE
```

### OTP

``` text
expiresAt TTL
email + purpose
```

### Facility

Useful:

``` text
approvalStatus + isActive
sports
location
rating
```

### Court

``` text
facilityId + isActive
```

### Booking

``` text
userId + bookingDate
courtId + bookingDate + startTime
```

If fixed slots are used, create the necessary uniqueness constraint for:

``` text
courtId + bookingDate + startTime
```

The exact schema must be compatible with the concurrency strategy.

------------------------------------------------------------------------

# 44. Venue Filtering

Support:

``` text
search
sport
minPrice
maxPrice
venueType
rating
```

Important:

`startingPrice` should be derived from the cheapest active court where
practical.

Do not store duplicate values unnecessarily if they can become
inconsistent.

For example:

``` text
Venue starting price = min(court.pricePerHour)
```

If the facility module already stores a canonical starting price, use
that source consistently.

------------------------------------------------------------------------

# 45. Pagination

Every potentially large list must be paginated.

Use:

``` text
page
limit
```

Return:

``` json
{
  "page": 1,
  "limit": 10,
  "total": 100,
  "totalPages": 10
}
```

Never return an unbounded list of all bookings or venues.

------------------------------------------------------------------------

# 46. API Route Summary

Final route map:

``` text
AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/resend-otp
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

USERS
GET    /api/v1/users/me
PATCH  /api/v1/users/me

VENUES
GET    /api/v1/venues
GET    /api/v1/venues/popular
GET    /api/v1/venues/popular-sports
GET    /api/v1/venues/:venueId
GET    /api/v1/venues/:venueId/courts/:courtId/availability

BOOKINGS
POST   /api/v1/bookings
GET    /api/v1/bookings
GET    /api/v1/bookings/:bookingId
PATCH  /api/v1/bookings/:bookingId/cancel
```

------------------------------------------------------------------------

# 47. API Contract Examples

## Register

``` http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!",
  "fullName": "Test User"
}
```

## Login

``` http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!"
}
```

## Venue search

``` http
GET /api/v1/venues?search=arena&sport=BADMINTON&page=1&limit=10
```

## Availability

``` http
GET /api/v1/venues/64abc/courts/64def/availability?date=2026-08-25
Authorization: Bearer <token>
```

## Booking

``` http
POST /api/v1/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "facilityId": "64abc",
  "courtId": "64def",
  "bookingDate": "2026-08-25",
  "startTime": "18:00"
}
```

## My bookings

``` http
GET /api/v1/bookings?page=1&limit=10
Authorization: Bearer <token>
```

## Cancel

``` http
PATCH /api/v1/bookings/booking123/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Personal reason"
}
```

------------------------------------------------------------------------

# 48. Owner/Admin Integration Contract

The owner/admin modules are outside this task.

The user backend assumes the following data exists.

## Facility integration

The owner module must be able to create/update:

``` text
facilityId
ownerId
name
description
location
address
sports
amenities
photos
approvalStatus
isActive
```

The user module only consumes approved facilities.

## Court integration

The owner module must create/update:

``` text
courtId
facilityId
name
sportType
pricePerHour
operatingHours
isActive
```

## Blocked slots

If the owner module implements maintenance blocking, expose a compatible
read model such as:

``` text
BlockedSlot
├── facilityId
├── courtId
├── date
├── startTime
├── endTime
└── reason
```

The user availability/booking service should consume these records.

If the owner module does not yet have blocked slots, the user backend
must still work without them.

------------------------------------------------------------------------

# 49. Shared Database vs Separate Service

Preferred for a college/team MVP:

``` text
One MongoDB database
        ↓
Shared Facility/Court data
        ↓
User backend reads
        ↓
Owner backend writes
```

If the team instead builds separate services:

``` text
User Service
        ↓
Facility Service API
        ↓
Owner/Admin Service
```

do not invent a microservice architecture unnecessarily.

For an MVP, a modular monolith is preferable.

------------------------------------------------------------------------

# 50. Booking Transaction Strategy

Implement the safest practical approach supported by the chosen MongoDB
deployment.

For fixed hourly slots:

``` text
Unique key:
courtId + bookingDate + startTime
```

If the booking document uses this uniqueness constraint, an attempted
duplicate must produce:

``` text
409 Conflict
SLOT_UNAVAILABLE
```

If the application needs a temporary pending state during simulated
payment, ensure that pending bookings cannot permanently block slots.

Recommended flow:

``` text
create pending booking
        ↓
simulate payment
        ↓
SUCCESS
  ↓
CONFIRMED

FAILURE
  ↓
FAILED / delete temporary booking
```

If using a unique booking index, failed temporary bookings must be
cleaned up immediately or use a dedicated slot-reservation model.

Do not leave stale pending bookings indefinitely.

------------------------------------------------------------------------

# 51. Booking State Machine

Valid transitions:

``` text
PENDING
   ├──→ CONFIRMED
   └──→ PAYMENT_FAILED

CONFIRMED
   ├──→ CANCELLED
   └──→ COMPLETED

CANCELLED
   └──→ no further transition

COMPLETED
   └──→ no further transition
```

A user must never be able to manually set:

``` text
status = COMPLETED
```

or:

``` text
status = CONFIRMED
```

through an API request.

------------------------------------------------------------------------

# 52. Idempotency

Booking creation can be retried because of:

-   network failures
-   frontend retries
-   payment retries

Where practical, support an idempotency key:

``` http
Idempotency-Key: <unique-client-generated-key>
```

For MVP, this is recommended but not mandatory if the unique slot
constraint guarantees that duplicate booking requests cannot create
duplicate confirmed bookings.

If implemented, store:

``` text
userId
idempotencyKey
bookingId
```

with a unique constraint.

------------------------------------------------------------------------

# 53. Logging

Use structured logging.

Log:

``` text
requestId
HTTP method
route
status
duration
userId when authenticated
error code
```

Never log:

``` text
password
passwordHash
OTP
JWT
authorization header
```

------------------------------------------------------------------------

# 54. Health Endpoint

Implement:

``` http
GET /health
```

Response:

``` json
{
  "success": true,
  "status": "ok"
}
```

Optional DB status:

``` json
{
  "success": true,
  "status": "ok",
  "database": "connected"
}
```

------------------------------------------------------------------------

# 55. API Documentation

Add Swagger/OpenAPI if time permits.

Minimum documentation should cover:

-   auth
-   user profile
-   venues
-   availability
-   bookings

If Swagger is added:

``` text
/api-docs
```

------------------------------------------------------------------------

# 56. Testing Requirements

The AI agent MUST write tests.

## Authentication tests

Test:

-   successful signup
-   duplicate signup
-   invalid email
-   weak password
-   OTP verification
-   invalid OTP
-   expired OTP
-   resend OTP
-   successful login
-   wrong password
-   unverified login
-   inactive user login
-   `/auth/me`
-   unauthorized request

## User tests

Test:

-   get own profile
-   update own profile
-   cannot change role
-   invalid profile data

## Venue tests

Test:

-   list approved venues
-   rejected venue not returned
-   inactive venue not returned
-   search
-   sport filter
-   price filter
-   rating filter
-   pagination
-   venue detail
-   invalid venue ID
-   unavailable/inactive court

## Availability tests

Test:

-   valid date
-   past date rejected
-   operating hours respected
-   booked slot unavailable
-   free slot available
-   invalid court/facility relationship

## Booking tests

Test:

-   successful booking
-   price calculated server-side
-   unauthenticated booking rejected
-   booking another user's booking rejected
-   invalid court rejected
-   inactive court rejected
-   rejected venue rejected
-   past date rejected
-   invalid time rejected
-   outside operating hours rejected
-   already-booked slot rejected
-   cancellation
-   double cancellation
-   cancellation after start time
-   completed booking cannot cancel
-   payment failure

## Concurrency test

This is especially important.

Send two booking requests for:

``` text
same court
same date
same time
```

simultaneously.

Expected:

``` text
one → success
one → 409 SLOT_UNAVAILABLE
```

Never:

``` text
two → success
```

------------------------------------------------------------------------

# 57. Seed Data

Create a development seed script.

Seed:

### Users

``` text
1 verified USER
1 unverified USER
```

### Facilities

At least:

``` text
5 approved facilities
1 pending facility
1 rejected facility
```

### Courts

At least:

``` text
2–3 courts per facility
```

Sports:

``` text
BADMINTON
FOOTBALL
CRICKET
TENNIS
BASKETBALL
```

### Bookings

Create several historical/upcoming bookings to test:

-   confirmed
-   cancelled
-   completed
-   unavailable slots

Never commit real credentials.

------------------------------------------------------------------------

# 58. API Response Consistency

Use a central response helper.

Success:

``` json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Failure:

``` json
{
  "success": false,
  "message": "...",
  "errorCode": "..."
}
```

Do not make every controller invent a different response structure.

------------------------------------------------------------------------

# 59. Controllers vs Services

Controllers should be thin.

Bad:

``` text
controller:
  parse request
  query database
  calculate price
  check booking
  process payment
  update booking
  format response
```

Prefer:

``` text
Controller
    ↓
Validation
    ↓
Service
    ↓
Repository/Model
    ↓
Database
```

Business logic belongs in services.

Examples:

``` text
AuthService
VenueService
AvailabilityService
BookingService
PaymentService
```

------------------------------------------------------------------------

# 60. Important Business Logic Separation

### AuthService

Responsible for:

-   signup
-   password hashing
-   OTP
-   verification
-   login
-   JWT

### VenueService

Responsible for:

-   venue discovery
-   filtering
-   popular venues
-   venue details

### AvailabilityService

Responsible for:

-   operating hours
-   blocked slots
-   existing bookings
-   free slots

### BookingService

Responsible for:

-   validation
-   price calculation
-   concurrency
-   booking creation
-   cancellation
-   booking retrieval

### PaymentService

Responsible only for:

-   simulated payment
-   payment reference
-   payment status

------------------------------------------------------------------------

# 61. Do Not Trust Frontend Price

Frontend may display:

``` text
₹500
```

but backend must query:

``` text
Court.pricePerHour
```

and calculate:

``` text
amount = authoritative database price
```

The client cannot manipulate:

``` json
{
  "amount": 1
}
```

to pay ₹1 for a ₹500 court.

------------------------------------------------------------------------

# 62. Do Not Trust Frontend Availability

Frontend may say:

``` text
18:00 available
```

but backend must check again during booking creation.

Availability API is for UX.

Booking API is the final authority.

------------------------------------------------------------------------

# 63. Important Edge Cases

The implementation must handle:

### Duplicate email

``` text
409 EMAIL_ALREADY_EXISTS
```

### Invalid OTP

``` text
400 INVALID_OTP
```

### Expired OTP

``` text
400 OTP_EXPIRED
```

### Wrong password

``` text
401 INVALID_CREDENTIALS
```

### Unverified account

``` text
403 EMAIL_NOT_VERIFIED
```

### Venue pending approval

Treat as unavailable to user.

### Venue rejected

Treat as unavailable to user.

### Court belongs to another venue

Reject.

### Court inactive

Reject.

### Booking in past

Reject.

### Slot outside operating hours

Reject.

### Slot already booked

``` text
409 SLOT_UNAVAILABLE
```

### Cancelled booking

Cannot cancel again.

### Completed booking

Cannot cancel.

### Invalid ObjectId

Return validation error rather than MongoDB stack trace.

------------------------------------------------------------------------

# 64. Definition of Done

The User Backend is considered complete only when all of the following
are true:

-   [ ] Project runs locally
-   [ ] MongoDB connects successfully
-   [ ] `.env.example` exists
-   [ ] User signup works
-   [ ] OTP verification works
-   [ ] OTP resend works
-   [ ] Login works
-   [ ] JWT authentication works
-   [ ] `/auth/me` works
-   [ ] User profile retrieval works
-   [ ] User profile update works
-   [ ] Approved venues can be listed
-   [ ] Search works
-   [ ] Sport filtering works
-   [ ] Price filtering works
-   [ ] Rating filtering works
-   [ ] Pagination works
-   [ ] Popular venues works
-   [ ] Popular sports works
-   [ ] Single venue details work
-   [ ] Court availability works
-   [ ] Booking creation works
-   [ ] Server calculates booking price
-   [ ] Simulated payment works
-   [ ] Booking confirmation works
-   [ ] My Bookings works
-   [ ] Booking detail works
-   [ ] Cancellation works
-   [ ] User ownership is enforced
-   [ ] Double booking is prevented
-   [ ] Validation is implemented
-   [ ] Error responses are consistent
-   [ ] Authentication endpoints are rate-limited
-   [ ] Passwords are hashed
-   [ ] Sensitive fields are never returned
-   [ ] Tests cover critical flows
-   [ ] Seed data exists
-   [ ] README contains setup instructions
-   [ ] API endpoint list is documented

------------------------------------------------------------------------

# 65. README Requirements

The generated project README must contain:

## Setup

``` bash
npm install
```

## Environment

``` bash
cp .env.example .env
```

Then explain required variables.

## Database

Explain MongoDB setup.

## Development

``` bash
npm run dev
```

## Production

``` bash
npm run build
npm start
```

## Tests

``` bash
npm test
```

## Seed

``` bash
npm run seed
```

## API

Document:

``` text
/api/v1/auth/*
/api/v1/users/*
/api/v1/venues/*
/api/v1/bookings/*
```

------------------------------------------------------------------------

# 66. AI Agent Execution Plan

The coding agent must work in this order.

## Phase 1 --- Inspect repository

Before writing code:

1.  Inspect existing files.
2.  Identify existing backend framework.
3.  Identify package manager.
4.  Identify database configuration.
5.  Identify existing models.
6.  Identify existing authentication.
7.  Identify existing Facility/Court models.
8.  Identify existing route conventions.
9.  Preserve existing conventions where compatible.

Do not rewrite the project blindly.

## Phase 2 --- Backend foundation

Implement:

``` text
Express app
MongoDB connection
environment configuration
error handling
validation
logging
CORS
Helmet
rate limiting
health endpoint
```

## Phase 3 --- Authentication

Implement:

``` text
User model
OTP model
registration
OTP verification
resend OTP
login
JWT middleware
auth/me
logout
```

## Phase 4 --- User profile

Implement:

``` text
GET /users/me
PATCH /users/me
```

## Phase 5 --- Venue discovery

Implement:

``` text
GET /venues
GET /venues/popular
GET /venues/popular-sports
GET /venues/:venueId
```

## Phase 6 --- Availability

Implement:

``` text
GET /venues/:venueId/courts/:courtId/availability
```

## Phase 7 --- Booking

Implement:

``` text
Booking model
availability validation
server-side pricing
concurrency protection
simulated payment
booking creation
```

## Phase 8 --- Booking management

Implement:

``` text
GET /bookings
GET /bookings/:bookingId
PATCH /bookings/:bookingId/cancel
```

## Phase 9 --- Tests

Write tests for all critical paths.

## Phase 10 --- Seed + documentation

Create:

``` text
seed script
README
API docs
.env.example
```

## Phase 11 --- Final audit

Check:

``` text
security
authorization
double booking
validation
error handling
API consistency
frontend integration
```

------------------------------------------------------------------------

# 67. Frontend Integration Contract

The frontend developer should be able to use the backend without knowing
database internals.

Frontend should never need to know:

``` text
passwordHash
OTP hash
ownerId
database implementation
payment internals
```

Frontend should only receive safe DTOs.

Recommended frontend-facing object:

``` typescript
type User = {
  id: string;
  email: string;
  fullName: string;
  avatar?: string | null;
  role: "USER";
};
```

Booking:

``` typescript
type Booking = {
  id: string;
  facility: {
    id: string;
    name: string;
  };
  court: {
    id: string;
    name: string;
  };
  sportType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  amount: number;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  bookingStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentReference?: string;
};
```

------------------------------------------------------------------------

# 68. What the AI Agent Must NOT Do

Do not:

-   build admin dashboard
-   build facility-owner dashboard
-   create owner APIs
-   create admin APIs
-   allow users to create venues
-   allow users to modify courts
-   allow users to change prices
-   allow users to approve venues
-   expose all users
-   expose other users' bookings
-   trust frontend prices
-   trust frontend availability
-   store plaintext passwords
-   return OTP in production
-   integrate a real payment gateway
-   implement unnecessary microservices
-   over-engineer recommendations
-   add unnecessary Redis/Kafka unless the existing architecture already
    requires them
-   introduce GraphQL when REST is already specified
-   replace MongoDB with another database
-   rewrite unrelated frontend code
-   modify owner/admin logic unless required for a clearly documented
    shared-model integration

------------------------------------------------------------------------

# 69. Final Quality Gate

Before declaring the implementation complete, the AI agent must be able
to answer YES to:

``` text
Can a new user register?
Can they verify OTP?
Can they log in?
Can they access their own profile?
Can they browse approved venues?
Can they search/filter venues?
Can they see venue details?
Can they see available court slots?
Can they select a slot?
Can they create a booking?
Is the price calculated by the backend?
Is payment simulated?
Can two users NOT book the same slot?
Can the user see their bookings?
Can the user cancel a valid booking?
Can the user NOT access another user's booking?
Are passwords protected?
Are sensitive fields hidden?
Are invalid requests rejected?
Are APIs consistently formatted?
Are critical flows tested?
Can the frontend integrate without touching the database?
```

If any answer is NO, the User Backend is not finished.

------------------------------------------------------------------------

# 70. Priority Order

If time becomes limited, implement in this exact priority:

### P0 --- Mandatory

``` text
Authentication
JWT
OTP
User profile
Venue listing
Venue detail
Court availability
Booking creation
Double-booking protection
Simulated payment
My bookings
Booking detail
Cancellation
Validation
Authorization
```

### P1 --- Important

``` text
Search
Filters
Pagination
Popular venues
Popular sports
Rate limiting
Seed data
Tests
```

### P2 --- Optional

``` text
Swagger
Advanced analytics
Review system
Idempotency
Notification system
Persistent COMPLETED status scheduler
```

Never sacrifice P0 booking correctness for P2 features.

------------------------------------------------------------------------

# 71. Final Instruction to the AI Coding Agent

Treat this file as the implementation contract.

Before coding:

``` text
inspect → plan → implement → test → audit
```

Do not invent requirements that conflict with this specification.

Do not implement owner/admin features.

Do not use frontend state as the source of truth for authentication,
price, availability, or booking status.

The backend is responsible for correctness.

The most important invariant is:

> **A confirmed court slot can belong to at most one user for a given
> court, date, and time interval.**

The second most important invariant is:

> **A user can only read or modify resources they are authorized to
> access.**

The third is:

> **The backend, not the frontend, determines the final booking price
> and availability.**

Build the User Backend end-to-end, keep the API contract stable, write
tests for critical flows, and leave clear integration boundaries for the
Facility Owner and Admin modules.
