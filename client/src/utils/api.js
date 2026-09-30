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

