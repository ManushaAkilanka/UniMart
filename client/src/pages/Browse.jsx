import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getListings } from '../utils/api';
import { ListingCard } from '../components/ui/ListingCard';
import { cn } from '../utils/cn';

// ── Constants ────────────────────────────────────────────────────────────────

const LISTING_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'sale', label: 'For Sale' },
  { value: 'free', label: 'FREE' },
  { value: 'rent', label: 'Rent' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'wanted', label: 'Wanted' },
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'used-good', label: 'Used · Good' },
  { value: 'used-fair', label: 'Used · Fair' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Uploads' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'popular', label: 'Most Viewed' },
];

const CAMPUSES = [
  'University of Colombo',
  'University of Moratuwa',
  'University of Peradeniya',
  'University of Kelaniya',
  'SLIIT Malabe',
  'University of Ruhuna',
];

// ── Price Slider ──────────────────────────────────────────────────────────────
const PriceSlider = ({ min, max, value, onChange }) => {
  const handleMin = (e) => onChange([Number(e.target.value), value[1]]);
  const handleMax = (e) => onChange([value[0], Number(e.target.value)]);

  const pct = (v) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(value[0]);
  const widthPct = pct(value[1]) - leftPct;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1.5 bg-surface-container-high rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-1.5 bg-secondary rounded-full pointer-events-none"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        {/* Min handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={500}
          value={value[0]}
          onChange={handleMin}
          className="absolute w-full appearance-none bg-transparent cursor-pointer range-thumb-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-surface [&::-webkit-slider-thumb]:ring-offset-0"
        />
        {/* Max handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={500}
          value={value[1]}
          onChange={handleMax}
          className="absolute w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-surface [&::-webkit-slider-thumb]:ring-offset-0"
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
        <span>Rs. {value[0].toLocaleString('en-LK')}</span>
        <span>Rs. {value[1].toLocaleString('en-LK')}</span>
      </div>
    </div>
  );
};

// ── Active filter chip ────────────────────────────────────────────────────────
const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold shadow-sm">
    <span>{label}</span>
    <button onClick={onRemove} type="button" className="hover:opacity-70">
      <span className="material-symbols-outlined text-sm leading-none">close</span>
    </button>
  </span>
);

// ── Filter section heading ────────────────────────────────────────────────────
const FilterHeading = ({ children }) => (
  <span className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wider font-semibold">
    {children}
  </span>
);

// ── Main component ─────────────────────────────────────────────────────────────
export const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive state from URL
  const search = searchParams.get('search') || '';
  const categorySlug = searchParams.get('category') || '';
  const listingType = searchParams.get('listingType') || '';
  const conditionParam = searchParams.get('condition') || '';
  const campusParam = searchParams.get('campus') || '';
  const sortParam = searchParams.get('sort') || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local sidebar filter state (mirror URL but allow uncommitted edits)
  const [localSearch, setLocalSearch] = useState(search);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedConditions, setSelectedConditions] = useState(
    conditionParam ? conditionParam.split(',') : []
  );
  const [selectedCampus, setSelectedCampus] = useState(campusParam);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchDebounceRef = useRef(null);

  // Sync localSearch → URL after 400ms debounce (only when localSearch actually differs from current URL search)
  useEffect(() => {
    if (localSearch === search) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (localSearch) next.set('search', localSearch);
        else next.delete('search');
        next.set('page', '1');
        return next;
      });
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [localSearch, search, setSearchParams]);

  // Keep localSearch in sync when URL search param changes externally (e.g. from Navbar or links)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Fetch listings when URL params change
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pageParam,
        limit: 12,
        sort: sortParam,
      };
      if (search) params.search = search;
      if (categorySlug) params.category = categorySlug;
      if (listingType) params.listingType = listingType;
      if (conditionParam) params.condition = conditionParam;
      if (campusParam) params.campus = campusParam;
      if (priceRange[0] > 0) params.minPrice = priceRange[0];
      if (priceRange[1] < 100000) params.maxPrice = priceRange[1];

      const res = await getListings(params);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Could not load listings.');
    } finally {
      setLoading(false);
    }
  }, [search, categorySlug, listingType, conditionParam, campusParam, sortParam, pageParam, priceRange]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // ── URL helpers ──────────────────────────────────────────────────────────
  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') {
        next.set('page', '1');
      }
      return next;
    });
  };

  const removeFilter = (key) => setParam(key, '');

  const resetAll = () => {
    setLocalSearch('');
    setPriceRange([0, 100000]);
    setSelectedConditions([]);
    setSelectedCampus('');
    setSearchParams({});
  };

  const toggleCondition = (val) => {
    const next = selectedConditions.includes(val)
      ? selectedConditions.filter((c) => c !== val)
      : [...selectedConditions, val];
    setSelectedConditions(next);
    setParam('condition', next.join(','));
  };

  const handleCampus = (val) => {
    const next = selectedCampus === val ? '' : val;
    setSelectedCampus(next);
    setParam('campus', next);
  };

  const handleSort = (val) => setParam('sort', val);
  const handlePage = (p) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Active filter chips ──────────────────────────────────────────────────
  const activeChips = [
    search && { label: `"${search}"`, key: 'search' },
    categorySlug && { label: `Category: ${categorySlug}`, key: 'category' },
    listingType && { label: `Type: ${LISTING_TYPES.find((t) => t.value === listingType)?.label || listingType}`, key: 'listingType' },
    conditionParam && { label: `Condition: ${conditionParam}`, key: 'condition' },
    campusParam && { label: `Campus: ${campusParam}`, key: 'campus' },
    priceRange[0] > 0 || priceRange[1] < 100000
      ? { label: `Rs. ${priceRange[0].toLocaleString()} – Rs. ${priceRange[1].toLocaleString()}`, key: 'price' }
      : null,
  ].filter(Boolean);

  const listings = data?.listings || [];
  const pagination = data?.pagination;
  const facets = data?.facets;

  // ── Sidebar JSX ─────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-lg">

      {/* Listing Type */}
      <div className="flex flex-col gap-space-xs">
        <FilterHeading>Listing Type</FilterHeading>
        <div className="flex flex-col gap-1">
          {LISTING_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setParam('listingType', value)}
              type="button"
              className={cn(
                'text-left flex items-center justify-between px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                listingType === value
                  ? 'bg-secondary-container/40 text-secondary font-semibold'
                  : 'text-on-surface hover:bg-surface-container'
              )}
            >
              <span>{label}</span>
              {listingType === value && (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-outline-variant/20" />

      {/* Category facets */}
      {facets?.categories?.length > 0 && (
        <div className="flex flex-col gap-space-xs">
          <FilterHeading>Categories</FilterHeading>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setParam('category', '')}
              type="button"
              className={cn(
                'text-left flex items-center justify-between px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                !categorySlug
                  ? 'bg-secondary-container/40 text-secondary font-semibold'
                  : 'text-on-surface hover:bg-surface-container'
              )}
            >
              <span>All Categories</span>
            </button>
            {facets.categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setParam('category', cat.slug)}
                type="button"
                className={cn(
                  'text-left flex items-center justify-between px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  categorySlug === cat.slug
                    ? 'bg-secondary-container/40 text-secondary font-semibold'
                    : 'text-on-surface hover:bg-surface-container'
                )}
              >
                <span>{cat.name}</span>
                <span className="text-[11px] font-mono text-on-surface-variant opacity-60">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {facets?.categories?.length > 0 && <div className="h-px bg-outline-variant/20" />}

      {/* Price Range */}
      <div className="flex flex-col gap-space-xs">
        <FilterHeading>Price Range</FilterHeading>
        <PriceSlider min={0} max={100000} value={priceRange} onChange={setPriceRange} />
      </div>

      <div className="h-px bg-outline-variant/20" />

      {/* Condition */}
      <div className="flex flex-col gap-space-xs">
        <FilterHeading>Condition</FilterHeading>
        <div className="flex flex-col gap-1.5">
          {CONDITIONS.map(({ value, label }) => {
            const count = facets?.conditions?.find((c) => c.condition === value)?.count;
            return (
              <label key={value} className="flex items-center justify-between cursor-pointer group">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes(value)}
                    onChange={() => toggleCondition(value)}
                    className="accent-secondary w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span className="text-[13px] text-on-surface group-hover:text-secondary transition-colors">
                    {label}
                  </span>
                </span>
                {count != null && (
                  <span className="text-[11px] font-mono text-on-surface-variant opacity-60">
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-outline-variant/20" />

      {/* Campus */}
      <div className="flex flex-col gap-space-xs">
        <FilterHeading>Campus</FilterHeading>
        <div className="flex flex-col gap-1">
          {CAMPUSES.map((c) => (
            <button
              key={c}
              onClick={() => handleCampus(c)}
              type="button"
              className={cn(
                'text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                selectedCampus === c
                  ? 'bg-secondary-container/40 text-secondary font-semibold'
                  : 'text-on-surface hover:bg-surface-container'
              )}
            >
              {selectedCampus === c && (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
              <span>{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      {activeChips.length > 0 && (
        <button
          onClick={resetAll}
          type="button"
          className="mt-auto text-secondary font-label-sm text-label-sm hover:underline font-semibold text-left"
        >
          Reset all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full">
      {/* ── Breadcrumb strip ─────────────────────────────────────────────── */}
      <div className="w-full bg-surface-container-low shadow-sm">
        <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <nav className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
              <Link to="/" className="hover:text-secondary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-base">home</span>
                <span>Home</span>
              </Link>
              <span className="material-symbols-outlined text-sm text-outline-variant">chevron_right</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Browse Listings</span>
            </nav>
            <div className="hidden sm:flex items-center gap-2 font-code-sm text-code-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary text-sm">verified_user</span>
              <span>
                Only Verified <strong>@*.ac.lk</strong> Accounts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + Sort toolbar ─────────────────────────────────────────── */}
      <div className="w-full bg-surface-container-lowest shadow-sm sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-md flex flex-col gap-space-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
            {/* Search input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                search
              </span>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search academic gear, laptops, Casio fx, dorm racks..."
                className="w-full h-11 pl-11 pr-4 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
              />
            </div>

            {/* Sort + Mobile filter toggle */}
            <div className="flex items-center justify-between sm:justify-end gap-space-sm shrink-0">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                type="button"
                className="lg:hidden inline-flex items-center gap-1 h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                <span>Filters</span>
                {activeChips.length > 0 && (
                  <span className="ml-1 min-w-[20px] h-5 px-1 rounded-full bg-secondary text-on-secondary text-[11px] font-bold flex items-center justify-center">
                    {activeChips.length}
                  </span>
                )}
              </button>

              {/* Sort select */}
              <div className="flex items-center gap-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap hidden sm:block">
                  Sort by:
                </label>
                <div className="relative">
                  <select
                    value={sortParam}
                    onChange={(e) => handleSort(e.target.value)}
                    className="appearance-none h-11 pl-3 pr-8 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold cursor-pointer focus:outline-none hover:bg-surface-container-high transition-colors"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active filter chips + result count */}
          {(activeChips.length > 0 || data) && (
            <div className="flex flex-wrap items-center justify-between gap-space-xs pt-space-2xs">
              <div className="flex flex-wrap items-center gap-space-xs">
                {activeChips.length > 0 && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant mr-1 uppercase tracking-wider font-semibold">
                    Active:
                  </span>
                )}
                {activeChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    onRemove={() => removeFilter(chip.key)}
                  />
                ))}
                {activeChips.length > 1 && (
                  <button
                    onClick={resetAll}
                    type="button"
                    className="font-label-sm text-label-sm text-secondary hover:underline ml-1 font-semibold"
                  >
                    Reset all
                  </button>
                )}
              </div>
              {pagination && (
                <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span>
                    Showing <strong>{listings.length}</strong> of{' '}
                    <strong>{pagination.total}</strong> listings
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid + sidebar ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-md lg:px-margin-lg py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg lg:gap-space-xl items-start">

          {/* Sidebar — desktop */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-40">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">tune</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">Filters</h2>
              </div>
              {activeChips.length > 0 && (
                <span className="font-code-sm text-code-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
                  {activeChips.length} Active
                </span>
              )}
            </div>
            <SidebarContent />
          </aside>

          {/* Mobile sidebar drawer */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="relative ml-auto w-80 max-w-full h-full bg-surface overflow-y-auto p-space-md shadow-xl">
                <div className="flex items-center justify-between mb-space-md">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Filters
                  </h2>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    type="button"
                    className="p-2 rounded-lg hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <SidebarContent />
              </div>
            </div>
          )}

          {/* Listings grid */}
          <section className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-lg">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ListingCard key={i} skeleton />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                  error_outline
                </span>
                <div>
                  <p className="font-headline-md text-headline-md text-on-surface mb-1">
                    Couldn't load listings
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
                </div>
                <button
                  onClick={fetchListings}
                  type="button"
                  className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                    search_off
                  </span>
                </div>
                <div>
                  <p className="font-headline-lg text-headline-lg text-on-surface mb-2">
                    No listings found
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                    Try adjusting your filters or search query.
                  </p>
                </div>
                <button
                  onClick={resetAll}
                  type="button"
                  className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-lg">
                  {listings.map((listing) => (
                    <ListingCard key={listing._id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-space-2xl">
                    <button
                      disabled={pageParam <= 1}
                      onClick={() => handlePage(pageParam - 1)}
                      type="button"
                      className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) => p === 1 || p === pagination.totalPages || Math.abs(p - pageParam) <= 2
                      )
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-on-surface-variant">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => handlePage(item)}
                            type="button"
                            className={cn(
                              'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                              item === pageParam
                                ? 'bg-secondary text-on-secondary'
                                : 'hover:bg-surface-container text-on-surface'
                            )}
                          >
                            {item}
                          </button>
                        )
                      )}

                    <button
                      disabled={pageParam >= pagination.totalPages}
                      onClick={() => handlePage(pageParam + 1)}
                      type="button"
                      className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
