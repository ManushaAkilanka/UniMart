/**
 * UniMart API client — thin wrappers around fetch with
 * cookie-based auth and JSON parsing.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Listings ──────────────────────────────────────────────────────────────────

/** GET /api/listings with query params */
export function getListings(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/listings${qs ? `?${qs}` : ''}`);
}

/** GET /api/listings/:id */
export function getListingById(id) {
  return request(`/listings/${id}`);
}

/** GET /api/listings/mine */
export function getMyListings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/listings/mine${qs ? `?${qs}` : ''}`);
}

/** POST /api/listings */
export function createListing(data) {
  const isFormData = data instanceof FormData;
  return request('/listings', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  });
}

/** PATCH /api/listings/:id */
export function updateListing(id, data) {
  const isFormData = data instanceof FormData;
  return request(`/listings/${id}`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
}

/** PATCH /api/listings/:id/status */
export function updateListingStatus(id, status) {
  return request(`/listings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/** DELETE /api/listings/:id */
export function deleteListing(id) {
  return request(`/listings/${id}`, {
    method: 'DELETE',
  });
}

/** POST /api/listings/:id/claim — claim a free listing */
export function claimListing(id) {
  return request(`/listings/${id}/claim`, { method: 'POST' });
}

/** POST /api/listings/:id/release-claim — owner releases an existing claim */
export function releaseClaim(id) {
  return request(`/listings/${id}/release-claim`, { method: 'POST' });
}

// ── Categories ────────────────────────────────────────────────────────────────

/** GET /api/categories */
export function getCategories() {
  return request('/categories');
}

// ── Favorites ─────────────────────────────────────────────────────────────────

/** GET /api/favorites — paginated favorites list with full listing data */
export function getFavorites(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/favorites${qs ? `?${qs}` : ''}`);
}

/** GET /api/favorites/ids — lightweight set of favorited listing IDs */
export function getFavoriteIds() {
  return request('/favorites/ids');
}

/** POST /api/favorites — add listing to favorites */
export function addFavorite(listingId) {
  return request('/favorites', {
    method: 'POST',
    body: JSON.stringify({ listingId }),
  });
}

/** DELETE /api/favorites/:listingId — remove from favorites */
export function removeFavorite(listingId) {
  return request(`/favorites/${listingId}`, {
    method: 'DELETE',
  });
}

// ── User Profile ──────────────────────────────────────────────────────────────

/** GET /api/users/me — authenticated user own profile */
export function getMyProfile() {
  return request('/users/me');
}

/** PATCH /api/users/me — update own profile */
export function updateMyProfile(data) {
  return request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** GET /api/users/:id/profile — public seller profile */
export function getSellerProfile(userId) {
  return request(`/users/${userId}/profile`);
}

/** GET /api/users/:id/listings — public active listings for a seller */
export function getSellerListings(userId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/users/${userId}/listings${qs ? `?${qs}` : ''}`);
}

// ── Conversations & Messages ──────────────────────────────────────────────────

/** GET /api/conversations */
export function getConversations() {
  return request('/conversations');
}

/** GET /api/conversations/unread-count */
export function getUnreadMessageCount() {
  return request('/conversations/unread-count');
}

/** POST /api/conversations */
export function createConversation(listingId) {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify({ listingId }),
  });
}

/** GET /api/conversations/:id/messages */
export function getConversationMessages(id) {
  return request(`/conversations/${id}/messages`);
}

/** POST /api/conversations/:id/messages */
export function sendMessage(id, data) {
  return request(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** PATCH /api/conversations/:id/messages/:messageId/proposal */
export function respondToProposal(id, messageId, status) {
  return request(`/conversations/${id}/messages/${messageId}/proposal`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Safety & Moderation (Block & Report) ──────────────────────────────────────

/** POST /api/users/:id/block */
export function blockUser(userId) {
  return request(`/users/${userId}/block`, {
    method: 'POST',
  });
}

/** POST /api/users/:id/unblock */
export function unblockUser(userId) {
  return request(`/users/${userId}/unblock`, {
    method: 'POST',
  });
}

/** GET /api/users/blocked */
export function getBlockedUsers() {
  return request('/users/blocked');
}

/** POST /api/reports */
export function submitReport(data) {
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Admin / Moderation ────────────────────────────────────────────────────────

/** GET /api/admin/stats */
export function getAdminStats() {
  return request('/admin/stats');
}

/** GET /api/admin/reports */
export function getAdminReports(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/admin/reports${qs ? `?${qs}` : ''}`);
}

/** GET /api/admin/reports/:id */
export function getAdminReportById(id) {
  return request(`/admin/reports/${id}`);
}

/** PATCH /api/admin/reports/:id */
export function updateReport(id, data) {
  return request(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** GET /api/admin/users */
export function getAdminUsers(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/admin/users${qs ? `?${qs}` : ''}`);
}

/** GET /api/admin/users/:id */
export function getAdminUserById(id) {
  return request(`/admin/users/${id}`);
}

/** PATCH /api/admin/users/:id/suspend */
export function adminSuspendUser(id, reason) {
  return request(`/admin/users/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/** PATCH /api/admin/users/:id/unsuspend */
export function adminUnsuspendUser(id) {
  return request(`/admin/users/${id}/unsuspend`, { method: 'PATCH' });
}

/** PATCH /api/admin/users/:id/role */
export function changeUserRole(id, role) {
  return request(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

/** GET /api/admin/listings */
export function getAdminListings(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/admin/listings${qs ? `?${qs}` : ''}`);
}

/** PATCH /api/admin/listings/:id/hide */
export function adminHideListing(id, reason) {
  return request(`/admin/listings/${id}/hide`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/** PATCH /api/admin/listings/:id/approve */
export function adminApproveListing(id) {
  return request(`/admin/listings/${id}/approve`, { method: 'PATCH' });
}

/** GET /api/admin/verification-queue */
export function getVerificationQueue(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/verification-queue${qs ? `?${qs}` : ''}`);
}

/** PATCH /api/admin/verification-queue/:id/approve */
export function approveVerification(id) {
  return request(`/admin/verification-queue/${id}/approve`, { method: 'PATCH' });
}

/** GET /api/admin/pending-accounts */
export function getPendingAccounts(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/admin/pending-accounts${qs ? `?${qs}` : ''}`);
}

/** PATCH /api/admin/users/:id/approve */
export function approveAccount(id) {
  return request(`/admin/users/${id}/approve`, { method: 'PATCH' });
}

/** GET /api/admin/audit-log */
export function getAuditLog(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/admin/audit-log${qs ? `?${qs}` : ''}`);
}

// ── Notifications ─────────────────────────────────────────────────────────────

/** GET /api/notifications */
export function getNotifications(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/notifications${qs ? `?${qs}` : ''}`);
}

/** PATCH /api/notifications/:id/read */
export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PATCH' });
}

/** PATCH /api/notifications/read-all */
export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}

