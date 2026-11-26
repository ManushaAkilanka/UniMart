# UniMart Testing Architecture & Quality Assurance Report

UniMart enforces a disciplined testing strategy designed to validate correctness, data integrity, real-time communication, and security across the entire campus marketplace.

---

## 1. Quality Assurance Summary

| Metric | Status | Details |
| :--- | :--- | :--- |
| **Server Integration Suites** | **9 / 9 Passing (100%)** | Includes the analytics suite alongside listing, favorites, auth, admin, conversation, socket, notification, and security suites |
| **Total Server Test Cases** | **217 Passed / 0 Failed** | Verified with the current server test run |
| **Client Production Build** | **Clean (Exit Code 0)** | Vite + React + Tailwind + PostCSS bundle verification |
| **End-to-End Suite** | **Active (Playwright)** | Comprehensive browser workflows in `e2e/marketplace.spec.js` and `e2e/navbar.spec.js` |
| **Database Isolation** | **100% Ephemeral** | `mongodb-memory-server` per-suite spun up and torn down in memory |

---

## 2. Testing Pyramid & Tooling

```
                 / \
                /   \
               / E2E \       Playwright (End-to-End browser scenarios)
              /-------\
             /  Integ  \     Supertest + Vitest + Socket.IO Client + MongoDB Memory Server
            /-----------\
           / Unit / Middle\  Zod Schemas, File Magic Bytes, Recommendation Algorithms, Auth Guards
          /----------------\
```

- **Vitest (v4.1+)**: ESM-native test runner configured with `fileParallelism: false`, `testTimeout: 30000`, and isolated worker execution.
- **Supertest (v7.3+)**: HTTP assertion library for testing Express REST API routes, middlewares, and cookie handling.
- **MongoDB Memory Server (`mongodb-memory-server` v11.3)**: Spins up isolated, zero-dependency in-memory MongoDB daemon instances per test suite (`testDB.js`), guaranteeing clean teardown and zero test pollution.
- **Socket.IO Client (v4.8+)**: Validates live WebSocket handshakes, authenticated room joins, message relays, and block suppression.
- **Playwright (v1.63)**: Cross-browser end-to-end automation driving real browser sessions, simulating buyer, seller, and administrator interactions.

---

## 3. Server Integration Test Suites Breakdown

### 3.1 `src/tests/listing.test.js` (41 Tests)
Validates core marketplace catalog operations, validation rules, permissions, and recommendation systems:
- **Category & Facet Pipeline**: Retrieves active categories ordered by `sortOrder`; computes dynamic category and condition facet counts.
- **Listing Creation**:
  - Enforces mandatory fields for sale listings (price, condition, primary category).
  - Validates wanted request listings without requiring price, condition, or images.
  - Rejects missing primary category with clear validation errors (regression-tested).
- **File Validation & Magic Bytes**: Rejects non-image files with spoofed extensions; accepts authentic JPEG/PNG/WebP headers and streams to Cloudinary.
- **Search, Filtering & Pagination**:
  - Keyword search across titles and descriptions.
  - Category slug filtering, price range boundaries, and listing types (`sale`, `free`, `wanted`).
  - Caps page limit at 50 to prevent unbounded query memory pressure.
  - Sanitizes query keys against NoSQL injection attempts.
- **Lifecycle & Access Control**:
  - Increments `viewCount` safely for guests/other students; prevents self-view inflation by owner.
  - Blocks User B from editing, updating status, or deleting User A's listing (`403 Forbidden`).
  - Permits listing owner to edit, mark sold, mark fulfilled, or delete.
- **Free Item Claim Workflow**:
  - User B claims free item; automatically initiates conversation and notification.
  - Blocks owner from claiming own item.
  - Blocks claiming non-free items; rejects double claims with `409 Conflict`.
  - Allows owner to release claim back to active status; blocks non-owners from releasing claims.
- **Account Verification Gates**:
  - Blocks unapproved users (`accountStatus: 'pending_approval'`) from posting or claiming listings (`403 ACCOUNT_PENDING_APPROVAL`).
- **Recommendation & Similarity Engine**:
  - Returns popular/trending listings for unauthenticated guests (`GET /api/listings/recommendations`).
  - Returns personalized items based on user favorites and interactions.
  - Returns relevant similar items for target listing (`GET /api/listings/:id/similar`).

### 3.2 `src/tests/favorites.test.js` (46 Tests)
Validates user interaction, saved items, and user profile management:
- **Authentication Safeguards**: Rejects unauthenticated favorite toggles with `401 Unauthorized`.
- **Idempotent Toggling**: Allows students to save items; subsequent saves return `alreadySaved: true` without creating duplicate records.
- **Data Privacy**:
  - Excludes inactive or hidden items from favorites.
  - Ensures listing seller emails are strictly excluded from populated response payloads.
  - Verifies User B cannot query or access User A's saved list.
- **Custom Profile Avatar Upload**:
  - Handles `multipart/form-data` single file upload (`avatar`).
  - Validates image magic bytes; rejects invalid file buffers.
  - Updates `avatarUrl` in user profile upon successful Cloudinary upload.

### 3.3 `src/tests/auth.test.js` (44 Tests)
Validates identity verification, session cookies, password reset, and institutional policies:
- **Institutional Email Validation**: Restricts direct registration strictly to verified Sri Lankan university domains (`@*.ac.lk`).
- **OTP Verification Flow**: Issues time-limited 6-digit OTP codes; tests valid code acceptance, expired code rejection, and wrong code handling.
- **Session Cookie Security**: Emits `httpOnly` secure cookies with `SameSite=Lax` / `Strict`.
- **Brute-Force & Suspension**: Rejects invalid passwords, non-existent accounts, and immediately locks suspended users.
- **Google OAuth & Approval Workflow**:
  - Initiates Google OAuth redirect with proper scope and state parameter.
  - Exchanges authorization code and fetches Google user profile.
  - Automatically tags non-university emails as `accountStatus: 'pending_approval'`.
  - Links Google accounts to existing accounts with matching email addresses.
- **Forgot Password & Reset Flow (11 Tests)**:
  - Non-enumerating generic success for registered accounts, unregistered emails, Google-only accounts, and suspended users.
  - Dummy bcrypt execution to equalize response timing between existing and non-existing accounts.
  - Requesting new reset token invalidates existing active token.
  - Expired token rejected.
  - Single-use token consumption (reused token rejected).
  - Rate limiting on `/forgot-password` (5 req / 15m) and `/reset-password` (10 req / 15m).
  - Password reset updates `passwordHash` with bcrypt (12 rounds) and enables login with new credentials while invalidating old password.

### 3.4 `src/tests/admin.test.js` (31 Tests)
Tests privileged institutional moderation and governance:
- **Role Verification**: Blocks students and guests from accessing `/api/admin/*` endpoints (`403 Forbidden`).
- **Safety Reports**: Fetches reported conversations/listings, transitions report status (`investigating`, `resolved`, `dismissed`).
- **Moderation Actions**: Suspends fraudulent listings and abusive user accounts.
- **Institutional Approvals**: Retrieves pending non-university accounts and facilitates admin approval to activate full write access.

### 3.5 `src/tests/conversation.test.js` (13 Tests)
Tests peer-to-peer negotiation, message integrity, and chat privacy:
- **Conversation Lifecycle**: Creates unique 1-to-1 thread between buyer and seller per listing; subsequent calls return existing thread.
- **Safety Safeguards**: Blocks students from initiating chats with themselves; blocks suspended accounts.
- **Unauthorized Snoop Prevention**: Emits `403 Forbidden` if a third user attempts to fetch or post messages in a conversation they are not a participant in.
- **Meetup Proposals**: Validates structured campus meetup proposals (location, date/time, proposed price, status changes: `accepted`, `declined`).
- **User Blocking**: Allows blocking abusive parties and suppresses subsequent message exchanges.

### 3.6 `src/tests/socket.test.js` (7 Tests)
Tests real-time communication resilience:
- **Handshake Authentication**: Rejects unauthenticated socket connections.
- **Room Isolation**: Restricts socket room joins strictly to conversation participants.
- **Live Event Delivery**: Verifies instantaneous `new_message` event emission to connected buyer and seller sockets.
- **Block Suppression**: Confirms blocked user messages are never delivered across active sockets.

### 3.7 `src/tests/notification.test.js` (6 Tests)
Tests event-driven notifications:
- **Deduplication**: Suppresses redundant unread notifications when a user is already active in the chat room.
- **State Updates**: Validates `markOneRead` and `markAllRead` operations.

### 3.8 `src/tests/security.test.js`
Validates core HTTP infrastructure and dynamic attack resilience:
- **NoSQL Sanitize (Unit & Middleware)**: Recursively strips keys starting with `$` or containing `.` from nested payload objects, `req.body`, and `req.query`.
- **Helmet Security Headers**: Validates `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Cross-Origin-Resource-Policy: cross-origin`.
- **CORS 403 & Information Leakage**: Verifies unauthorized origins return a clean HTTP `403 Forbidden` with a generic message and zero stack trace disclosure.
- **Production Error Guard**: Confirms stack traces and internal filesystem paths are never leaked when `NODE_ENV=production`.
- **JWT Attack Resilience**: Rejects expired tokens (401), tampered signatures (401), and unsigned tokens with `alg: "none"` (401).
- **File Upload Attack Defense**: Validates buffer magic byte signatures; rejects disguised executable scripts or text files claiming to be images.
- **OAuth Open Redirect Defense**: Verifies callbacks redirect exclusively to whitelisted `CLIENT_URL`.
- **Production Cookie Flags**: Confirms `secure: true`, `httpOnly: true`, and `sameSite: strict` in production mode.

### 3.9 `src/tests/admin.analytics.test.js` (3 Tests)
Validates analytics access control, strict query parsing, aggregation accuracy, and response privacy:
- Unauthenticated requests receive `401`; moderators and ordinary users receive `403`.
- Invalid ranges, limits above 25, and unknown query parameters receive `400`.
- Small MongoDB fixtures verify overview counts, seller ranks, estimated sold value, sell-through, engagement, category mix, campus aggregates, and trend totals.
- Analytics responses omit student IDs and credentials and mask seller emails.

The authentication suite also completes a forgot-password/reset-password request using the LAN origin and checks that the mocked email link is built from `CLIENT_URL`. Listing tests cover pending-user blocking, privileged active listings, and promotion CLI audit/failure behavior.

---

## 4. End-to-End Test Suites

Playwright automates real browser sessions:
1. **Marketplace User Flow (`e2e/marketplace.spec.js`)**:
   - Student registration with university credentials (`@sci.cmb.ac.lk`).
   - OTP email verification code submission (steps 1–6).
   - Wanted listing creation at `/sell`.
   - Marketplace discovery at `/browse`.
   - Buyer-to-seller real-time chat initiation at `/messages`.
   - Seller marking listing as sold / fulfilled.
   - Admin/moderator moderation console checks.
   - Category Select UX regression test.
2. **Navbar Functionality & Dark Mode Audit (`e2e/navbar.spec.js`)**:
   - Brand logo link navigates to home `/`.
   - Navigation links (Browse, Categories, Wanted, Free Items).
   - Global search input + Enter submits and filters results.
   - Post Listing button redirects unauthenticated users to `/login`.
   - Sign In and Register links navigate correctly.
   - Theme toggle toggles dark mode class on DOM root and persists in `localStorage` across page reload.
   - Mobile responsive drawer opens, responds to keyboard navigation (Escape to close), and links correctly.

---

## 5. Running Tests Locally

### Run Server Integration Tests
```bash
# Run all server integration test suites sequentially
npm --workspace=server test

# Run a specific test suite
npx vitest run src/tests/listing.test.js

# Run with watch mode
npm --workspace=server run test:watch

# Run with coverage report
npm --workspace=server run test:coverage
```

### Run Client Build & Linter
```bash
# Validate client production bundle
npm --workspace=client run build

# Run lint checks across client and server
npm run lint
```

### Run Playwright End-to-End Suite
```bash
# Run headless E2E tests
npx playwright test

# Run interactive UI mode
npx playwright test --ui
```
