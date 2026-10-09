import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getListings, getCategories, getRecommendations } from '../utils/api';
import { ListingCard } from '../components/ui/ListingCard';
import { useAuth } from '../context/AuthContext';

// ── Category icons from Stitch design ────────────────────────────────────────
const STATIC_CATEGORIES = [
  { slug: 'academic-gear', label: 'Academic', sub: 'Books & Calc', icon: 'menu_book' },
  { slug: 'electronics-laptops', label: 'Electronics', sub: 'Laptops, Audio', icon: 'devices' },
  { slug: 'hostel-dorm', label: 'Hostel Gear', sub: 'Desks, Lamps', icon: 'bed' },
  { slug: 'transport', label: 'Transport', sub: 'Cycles, Gear', icon: 'directions_bike' },
  { slug: 'apparel', label: 'Apparel', sub: 'Lab Coats, Bags', icon: 'styler' },
  { slug: 'sports-leisure', label: 'Sports & Fun', sub: 'Guitars, Gear', icon: 'sports_cricket' },
  { slug: 'free', label: 'Free Pool', sub: '100% Free', icon: 'volunteer_activism', highlight: true },
  { slug: 'wanted', label: 'Wanted', sub: 'Student Board', icon: 'campaign' },
];

const TRENDING_TAGS = [
  'Casio fx-991ES Plus',
  'Engineering Mathematics',
  'Dell 24" Monitor',
  'Hostel Study Table',
  'Single Mattress',
  'Bicycle with Helmet',
];

// ── Skeleton grid ─────────────────────────────────────────────────────────────
const SkeletonGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
    {Array.from({ length: count }).map((_, i) => (
      <ListingCard key={i} skeleton />
    ))}
  </div>
);

// ── Section component ─────────────────────────────────────────────────────────
const Section = ({ dot = true, eyebrow, title, subtitle, href, children, loading, error }) => (
  <section className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg mt-space-3xl">
    <div className="flex items-end justify-between mb-space-lg">
      <div>
        {dot && (
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {eyebrow}
            </span>
          </div>
        )}
        <h2 className="font-headline-xl text-headline-xl text-on-surface">{title}</h2>
        {subtitle && (
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          to={href}
          className="hidden sm:inline-flex items-center gap-1 font-headline-sm text-headline-sm text-secondary hover:underline"
        >
          <span>View all</span>
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      )}
    </div>

    {loading ? (
      <SkeletonGrid />
    ) : error ? (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">error_outline</span>
        <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
        <Link to={href} className="text-secondary font-headline-sm text-headline-sm hover:underline">
          Browse all listings →
        </Link>
      </div>
    ) : (
      children
    )}
  </section>
);

export const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [recommended, setRecommended] = useState({ data: null, loading: true, error: null });
  const [fresh, setFresh] = useState({ data: null, loading: true, error: null });
  const [popular, setPopular] = useState({ data: null, loading: true, error: null });
  const [freeItems, setFreeItems] = useState({ data: null, loading: true, error: null });
  const [wantedItems, setWantedItems] = useState({ data: null, loading: true, error: null });
  const [categories, setCategories] = useState([]);

  const fetchSection = useCallback(async (params, setter) => {
    try {
      setter((s) => ({ ...s, loading: true, error: null }));
      const res = await getListings({ limit: 4, ...params });
      setter({ data: res.data?.listings || [], loading: false, error: null });
    } catch (err) {
      setter({ data: null, loading: false, error: 'Could not load listings.' });
    }
  }, []);

  useEffect(() => {
    getRecommendations({ limit: 4 })
      .then((res) => {
        setRecommended({ data: res.data?.recommendations || [], loading: false, error: null });
      })
      .catch(() => {
        setRecommended({ data: [], loading: false, error: null });
      });

    fetchSection({ sort: 'newest', limit: 4 }, setFresh);
    fetchSection({ sort: 'popular', limit: 4 }, setPopular);
    fetchSection({ listingType: 'free', sort: 'newest', limit: 4 }, setFreeItems);
    fetchSection({ listingType: 'wanted', sort: 'newest', limit: 4 }, setWantedItems);

    getCategories()
      .then((res) => setCategories(res.data?.categories || []))
      .catch(() => {});
  }, [fetchSection]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/browse');
    }
  };

  return (
    <div className="flex flex-col w-full pb-space-3xl">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative w-full bg-surface-container-low px-margin md:px-margin-md lg:px-margin-lg pt-space-2xl pb-space-3xl overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-32 w-80 h-80 rounded-full bg-surface-variant/40 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Campus badge */}
          <div className="inline-flex flex-wrap items-center justify-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest shadow-sm mb-space-lg">
            <span className="material-symbols-outlined text-secondary text-base">near_me</span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              {import.meta.env.VITE_DEFAULT_CAMPUS || 'University of Colombo'}
            </span>
            <button
              className="font-label-sm text-label-sm text-secondary hover:underline font-semibold ml-space-2xs"
              type="button"
            >
              Change Campus
            </button>
          </div>

          {/* Hero headline */}
          <h1 className="font-display-hero text-display-hero text-on-surface max-w-3xl tracking-tight mb-space-md">
            Buy smarter. Sell faster.
            <br className="hidden sm:inline" />
            Stay on campus.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-space-xl">
            The trusted student-to-student marketplace for Sri Lankan campus communities. Exchange
            textbooks, tech, hostel essentials, and notes right where you study.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-3xl bg-surface-container-lowest rounded-xl p-space-xs shadow-md mb-space-md"
          >
            <div className="flex flex-col sm:flex-row items-center gap-space-xs">
              <div className="flex items-center gap-space-xs flex-1 w-full px-space-sm h-12">
                <span className="material-symbols-outlined text-secondary text-xl">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md focus:outline-none"
                  placeholder="What do you need for semester? Textbooks, calculators, dorm gear..."
                  type="text"
                />
              </div>
              <div className="flex items-center gap-space-xs w-full sm:w-auto px-space-xs sm:px-0">
                <div className="h-8 w-px bg-outline-variant/30 hidden sm:block" />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-space-lg h-11 rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-space-xs shadow-sm"
                >
                  <span>Find Deals</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          </form>

          {/* Trending tags */}
          <div className="flex flex-wrap items-center justify-center gap-space-xs max-w-4xl mb-space-2xl">
            <span className="font-label-sm text-label-sm text-on-surface-variant mr-space-xs uppercase tracking-wider">
              Trending:
            </span>
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => navigate(`/browse?search=${encodeURIComponent(tag)}`)}
                className="px-space-sm py-space-2xs rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm hover:bg-surface-container transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Trust ticker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm w-full max-w-3xl bg-surface-container-high/50 p-space-sm rounded-xl">
            {[
              { icon: 'inventory_2', value: '1,248', label: 'Active Colombo Listings' },
              { icon: 'verified_user', value: '3,420', label: '@*.ac.lk Verified Students', highlight: true },
              { icon: 'handshake', value: '0%', label: 'Commission Free Trades' },
            ].map(({ icon, value, label, highlight }) => (
              <div
                key={label}
                className={`flex items-center justify-center gap-space-sm py-space-xs px-space-md${highlight ? ' bg-surface-container-lowest rounded-lg shadow-sm' : ''}`}
              >
                <span className="material-symbols-outlined text-secondary text-xl">{icon}</span>
                <div className="text-left">
                  <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES GRID ──────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg -mt-8 relative z-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-space-xs p-space-xs bg-surface-container-lowest rounded-xl shadow-md">
          {STATIC_CATEGORIES.map((cat) => {
            const href =
              cat.slug === 'free'
                ? '/browse?listingType=free'
                : cat.slug === 'wanted'
                ? '/browse?listingType=wanted'
                : `/browse?category=${cat.slug}`;

            return (
              <Link
                key={cat.slug}
                to={href}
                className={`flex flex-col items-center text-center p-space-sm rounded-lg hover:bg-surface-container-low transition-colors group${cat.highlight ? ' bg-secondary-container/20' : ''}`}
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center mb-space-xs transition-colors${
                    cat.highlight
                      ? ' bg-secondary-container text-on-secondary-container group-hover:bg-secondary group-hover:text-on-secondary'
                      : ' bg-surface-container text-on-surface group-hover:bg-secondary group-hover:text-on-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                </div>
                <span
                  className={`font-headline-sm text-headline-sm${cat.highlight ? ' text-secondary' : ' text-on-surface'}`}
                >
                  {cat.label}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate w-full">
                  {cat.sub}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── RECOMMENDED FOR YOU ───────────────────────────────────────────── */}
      {recommended.data?.length > 0 && (
        <Section
          eyebrow={user ? 'Personalized For You' : 'Recommended'}
          title="Recommended For You"
          subtitle={
            user
              ? 'Handpicked listings based on your campus, favorites, and recent activity.'
              : 'Popular student listings trending across campus right now.'
          }
          href="/browse"
          loading={recommended.loading}
          error={recommended.error}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {recommended.data.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        </Section>
      )}

      {/* ── FRESH ON CAMPUS ───────────────────────────────────────────────── */}
      <Section
        eyebrow="Live Stream"
        title="Fresh on Campus"
        subtitle="Verified listings uploaded by Colombo undergrads in the last 24 hours."
        href="/browse?sort=newest"
        loading={fresh.loading}
        error={fresh.error}
      >
        {fresh.data?.length === 0 ? (
          <div className="col-span-4 py-16 text-center text-on-surface-variant font-body-md text-body-md">
            No listings yet — be the first to post!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {fresh.data?.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </Section>

      {/* ── POPULAR NEAR YOU ──────────────────────────────────────────────── */}
      <Section
        eyebrow="Most Viewed"
        title="Popular Near You"
        subtitle="Top-viewed campus listings students keep coming back to."
        href="/browse?sort=popular"
        loading={popular.loading}
        error={popular.error}
      >
        {popular.data?.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md py-8 text-center">
            No popular listings yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {popular.data?.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </Section>

      {/* ── FREE ON CAMPUS ────────────────────────────────────────────────── */}
      <Section
        eyebrow="Give & Take"
        title="Free on Campus"
        subtitle="Seniors giving away textbooks, lab coats, and study gear. No payment. No catch."
        href="/browse?listingType=free"
        loading={freeItems.loading}
        error={freeItems.error}
      >
        {freeItems.data?.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md py-8 text-center">
            No free items right now. Check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {freeItems.data?.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </Section>

      {/* ── WANTED REQUESTS ──────────────────────────────────────────────── */}
      <Section
        eyebrow="Student Requests"
        title="Wanted Requests"
        subtitle="Students actively searching for textbooks, lab tools, and gear. Got one to spare?"
        href="/browse?listingType=wanted"
        loading={wantedItems.loading}
        error={wantedItems.error}
      >
        {wantedItems.data?.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md py-8 text-center">
            No active student requests right now. Looking for something specific?{' '}
            <Link to="/create-listing" className="text-secondary font-headline-sm hover:underline">
              Post a Wanted Request →
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {wantedItems.data?.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </Section>

      {/* ── SAFETY BANNER ─────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg mt-space-3xl">
        <div className="bg-secondary-container/20 border border-secondary/20 rounded-xl p-space-xl flex flex-col sm:flex-row items-start sm:items-center gap-space-lg">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-on-secondary text-3xl">
              shield_with_house
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold mb-1">
              Campus Safety First
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              All sellers are verified via their university <strong>@*.ac.lk</strong> email. Meet
              only in well-lit campus public spaces — library lobbies, canteen queues, and faculty
              reception areas. Never send money before seeing the item in person.
            </p>
          </div>
          <Link
            to="/browse"
            className="shrink-0 inline-flex items-center gap-1 px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors shadow-sm"
          >
            <span>Browse Safely</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
};
