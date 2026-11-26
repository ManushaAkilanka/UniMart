# UniMart Security Architecture & Policy

UniMart is an institutional student-to-student campus marketplace tailored for Sri Lankan universities. Because campus transactions involve peer-to-peer exchanges, trust, privacy, and abuse prevention are core engineering requirements.

This document details the multi-layered defense-in-depth security model implemented across the UniMart backend and frontend applications.

---

## 1. Authentication & Session Management

### 1.1 Single-Token JWT with HTTP-Only Cookies
- **Session Architecture**:
  - Stateless JSON Web Token signed with HMAC-SHA256 (`JWT_SECRET`) containing user subject identifier `{ sub: userId }`.
  - Stored in an `httpOnly` cookie named `token`, shielding authentication state from client-side JavaScript access and Cross-Site Scripting (XSS) extraction.
  - Cookie flags configured in `auth.controller.js`:
    - `httpOnly: true`
    - `secure: true` in production (`ENV.NODE_ENV === 'production'`)
    - `sameSite: 'strict'` in production (`'lax'` in development)
    - `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days, matching `ENV.JWT_EXPIRES_IN = '7d'`)
  - User details (roles, permissions, account status) are never frozen inside token claims; instead, `requireAuth` middleware queries the database fresh on each authenticated request to guarantee immediate revocation when a user is suspended.
- **Client Storage**: Session tokens are never stored in client-side `localStorage` or `sessionStorage`.

### 1.2 Institutional Email Verification (`.ac.lk`)
- **Domain Verification**: Primary student registration enforces verified Sri Lankan university domains (`*.ac.lk`, such as `cmb.ac.lk`, `mrt.ac.lk`, `pdn.ac.lk`, `sjp.ac.lk`, `kln.ac.lk`, `ruh.ac.lk`). Evaluated via safe domain-suffix verification to completely eliminate catastrophic Regular Expression Denial of Service (ReDoS).
- **OTP Verification**: Email verification codes are cryptographically generated 6-digit numbers (`crypto.randomBytes(4)`), hashed with bcrypt (10 rounds in production/dev), and time-bounded by `ENV.VERIFICATION_CODE_EXPIRY_MINUTES` (defaults to 15 minutes) before accounts become verified.

### 1.3 Google OAuth 2.0 & Pending Approval Workflow
- Google OAuth authorization flow exchanges the authorization code with Google OAuth 2.0 token endpoint and validates user profile via `https://www.googleapis.com/oauth2/v3/userinfo`.
- Supports account linking: if an existing user registers via password and later signs in with Google using the same email, the Google ID is safely linked.
- If an authenticating user presents a non-`.ac.lk` email address:
  - Account is provisioned with `accountStatus: 'pending_approval'`.
  - The `requireApproved` middleware blocks listing creation, free item claiming, and chat initiation (`403 ACCOUNT_PENDING_APPROVAL`).
  - Institutional campus administrators verify credentials via the Admin Moderation Console before promoting to `'active'`.
- Admin and moderator roles bypass the pending-account gate; listing creation by either role is forced to `active`, regardless of the ordinary-user moderation default.
- `server/src/scripts/promote-admin.js <email>` is a manual-only CLI operation. It updates role, approval status, and verification state and records a `user.admin_promoted` audit entry. It does not execute when imported and no HTTP self-promotion route exists.

### 1.4 Password Security & Hashing
- Passwords are salted and hashed using `bcryptjs` with **12 salt rounds** in production and development (4 rounds in test environment for fast runner execution).
- Password complexity enforced at the Zod schema layer (`auth.schema.js`):
  - Minimum 8 characters, maximum 128 characters.
  - Regex requirement: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/` (at least one uppercase letter, one lowercase letter, and one number).
- Sensitive credentials (`passwordHash`, `emailVerificationCode`, `passwordResetToken`, `passwordResetExpiry`) are configured with `select: false` on the Mongoose schema and stripped in JSON transforms.

### 1.5 Forgot Password & Password Reset Security
- **Anti-Enumeration Protection**: `POST /api/auth/forgot-password` returns the exact same generic success message whether the email exists or not. Timing equalisation via dummy bcrypt hashing is executed for non-existent accounts so response timing cannot be used to enumerate campus emails.
- **Cryptographic Reset Tokens**: High-entropy 32-byte tokens (`crypto.randomBytes(32).toString('hex')`). Only the SHA-256 hash of the token is persisted in MongoDB (`passwordResetToken`) with a 15-minute expiry (`passwordResetExpiry`).
- **Single-Use Enforcement**: Tokens are invalidated immediately upon first consumption. Requesting a new token invalidates any previously issued token for that account.
- **OAuth & Suspended User Protection**: Accounts without a `passwordHash` (Google OAuth accounts) receive the generic response and no token is issued. Suspended accounts are barred from completing a password reset.
- **Strict Endpoint Rate Limiting**: `POST /api/auth/forgot-password` is limited to 5 requests / 15 minutes; `POST /api/auth/reset-password` is limited to 10 attempts / 15 minutes.

---

## 2. Authorization & Access Control

### 2.1 Role-Based Access Control (RBAC)
UniMart implements discrete user tiers:
| Role | Capabilities |
| :--- | :--- |
| **Guest** | Read public active listings, view categories, run searches, view seller public profiles. |
| **Pending Student** | Browse marketplace, view items, review onboarding banner; blocked from posting, claiming, or messaging. |
| **Verified Student** | Post listings, claim free items, initiate chats, manage favorites, update profile avatar. |
| **Moderator** | Review flagged safety reports, inspect reported conversations, suspend offending listings. |
| **Admin** | Full system administration, approve pending non-university accounts, manage categories, audit platform. |

### 2.2 Resource Ownership Validation
- All mutating endpoints (`PATCH /api/listings/:id`, `DELETE /api/listings/:id`, `PATCH /api/users/me`) verify that `req.user._id` matches the document's `sellerId` or `userId`.
- Unauthorized modification attempts immediately return `403 Forbidden` (`FORBIDDEN_OWNER_ONLY`).
- Self-claim prevention: Users are programmatically blocked from claiming their own free listings or starting negotiations with themselves.

### 2.3 Admin Analytics
- Analytics endpoints (`GET /api/admin/analytics/*`) require both authentication and the `admin` role; moderators and ordinary users receive `403`, and unauthenticated requests receive `401`.
- Query parameters are restricted by a strict Zod schema to `range` (`7d`, `30d`, `90d`, `all`), `limit` (1–25), `campus`, and `category`.
- Mongo aggregation response projections expose only seller name, faculty, campus, and masked email (`a***@domain`). They do not project student IDs, password hashes, OAuth IDs, verification/reset tokens, or other credential fields.
- The product does not process payments. “Estimated value sold” is the sum of listed prices for listings marked sold; it is self-reported and unverified, not revenue. Sold-date trend buckets use `updatedAt` because a dedicated sold timestamp is not stored.

---

## 3. Input Validation & Injection Mitigation

### 3.1 Strict Schema Validation (Zod)
- Incoming request bodies, route parameters, and query strings pass through strict Zod validation schemas prior to controller invocation.
- Type mismatches, un-whitelisted fields, or malformed values (e.g. invalid object IDs, negative prices, missing categories) are rejected with descriptive `400 Bad Request` or `422 Unprocessable Entity` payloads.

### 3.2 NoSQL Injection Prevention
- **Whitelisted Query Parameters**: `listing.controller.js` explicitly parses, sanitizes, and casts only permitted filter keys (`category`, `campus`, `minPrice`, `maxPrice`, `listingType`, `condition`, `search`, `page`, `limit`). Arbitrary MongoDB operators in query strings are rejected or stripped.
- **Custom Mongo Sanitize Middleware**: Dedicated middleware (`middleware/mongoSanitize.js`) recursively traverses and strips or replaces keys starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params`.
- **Regex Query Escaping**: Search inputs are sanitized through an escape utility (`sanitizeRegex`) before regex construction, preventing ReDoS (Regular Expression Denial of Service).

---

## 4. Media Upload Pipeline & Magic Bytes Verification

Campus listings and profile avatars accept image uploads through a strictly controlled pipeline:

```
[Client Multipart Request]
          │
          ▼
   [Multer MemoryStorage]  ──▶  Limits: 5MB per file, max 5 images
          │
          ▼
  [Magic Bytes Validation]  ──▶  Inspects initial buffer header:
   (checkImageSignature)         - JPEG: FF D8 FF
                                 - PNG:  89 50 4E 47
                                 - WebP: 52 49 46 46 ... 57 45 42 50
          │
          ▼ (Valid)
  [Cloudinary Remote Store] ──▶  Uploads to dedicated folder:
                                 - unimart/listings
                                 - unimart/avatars
                                 (Original files never touch local filesystem)
```

- **Extension Spoofing Defense**: Renaming malicious executables (e.g. `malware.exe` to `photo.jpg`) is immediately caught by magic byte signature inspection (`checkImageSignature`) and rejected with `400 INVALID_IMAGE_SIGNATURE`.
- **Zero Local Disk Footprint in Production**: Files are stored in memory buffers during validation and streamed directly to Cloudinary via TLS. In production (`ENV.NODE_ENV === 'production'`), the local-disk fallback is strictly disabled and throws an error; the server fails loudly at startup (`process.exit(1)`) if Cloudinary credentials are missing. Local disk storage is restricted purely to isolated local dev and test environments.

---

## 5. Network, Headers & Rate Limiting

### 5.1 HTTP Security Headers (Helmet)
- `helmet` is mounted in `app.js` with `crossOriginResourcePolicy: { policy: 'cross-origin' }` and `contentSecurityPolicy: false` (to permit Vite and local client asset loading).
- Emits baseline protective headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
  - `Cross-Origin-Resource-Policy: cross-origin`

### 5.2 Cross-Origin Resource Sharing (CORS)
- HTTP and Socket.IO use the same exact-origin allowlist:
  - `ENV.CLIENT_URL` (defaults to `http://localhost:5173`)
  - Comma-separated exact origins from optional `ALLOWED_ORIGINS`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- Outside production only, HTTP origins matching private IPv4 addresses on exact port `5173` over `http` are additionally allowed: `192.168.x.x`, `10.x.x.x`, and `172.16.x.x` through `172.31.x.x`. This is a strict regex match, not a wildcard; production never gets this LAN allowance.
- Password reset email URLs are based on `CLIENT_URL`; set it to the client origin reachable from the testing device.
- `credentials: true` restricted strictly to whitelisted origins.
- **Clean 403 Forbidden Response**: Unauthorized origins are intercepted and return a clean HTTP `403 Forbidden` with `{ "success": false, "message": "Origin not allowed by CORS policy" }`, suppressing internal stack traces and server details.

### 5.3 Route-Specific Abuse & Rate Limiting
Endpoint-specific rate limiters (`middleware/rateLimiter.js`) enforce protective thresholds:
- **Login (`POST /api/auth/login`)**: 10 attempts per 15 minutes per IP (`ENV.LOGIN_RATE_LIMIT_MAX` / `ENV.LOGIN_RATE_LIMIT_WINDOW_MINUTES`).
- **Registration (`POST /api/auth/register`)**: 15 accounts per 15 minutes per IP.
- **Verification (`POST /api/auth/verify-email`)**: 20 verification attempts per 15 minutes per IP.
- **Forgot Password (`POST /api/auth/forgot-password`)**: 5 requests per 15 minutes per IP.
- **Reset Password (`POST /api/auth/reset-password`)**: 10 attempts per 15 minutes per IP.
- **Messaging (`POST /api/conversations/:id/messages`)**: 30 messages per 1 minute.
- **Media Uploads (`POST /api/listings`, `PATCH /api/listings/:id`)**: 30 upload requests per 15 minutes.
- Rate limiting is bypassed during automated test execution unless the explicit opt-in header `x-test-rate-limit: true` is present, allowing deterministic security testing without slowing standard test suites.

---

## 6. Real-Time Communication (Socket.IO) Security

- Socket.IO handshakes require a valid JWT token extracted from either the HTTP-only cookie, auth object, or Authorization header.
- Suspended users are immediately rejected during handshake.
- Chat rooms are partitioned strictly by `conversationId`.
- Server-side verification confirms that the socket connection belongs to either the `buyerId` or `sellerId` before joining a room, preventing eavesdropping on private student transactions.

---

## 7. Vulnerability Disclosure Policy

If you discover a security vulnerability within the UniMart platform, please report it privately:
- **Email**: `security@unimart.ac.lk`
- Please do not disclose vulnerabilities publicly via GitHub Issues or public social channels until a fix has been validated and released.
- Include detailed steps to reproduce, affected endpoints, and proof-of-concept payloads.
