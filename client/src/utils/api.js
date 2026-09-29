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
