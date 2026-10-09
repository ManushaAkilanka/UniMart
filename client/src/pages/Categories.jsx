import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getListings } from '../utils/api';
import { cn } from '../utils/cn';

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, listingsRes] = await Promise.all([
          getCategories(),
          getListings({ limit: 1 }),
        ]);

        if (cancelled) return;

        const cats = catRes?.data?.categories || [];
        setCategories(cats);

        // Map count from facets
        const facets = listingsRes?.data?.facets?.categories || [];
        const countMap = {};
        facets.forEach((f) => {
          countMap[f.slug] = f.count;
        });
        setCategoryCounts(countMap);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load categories.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = categories.filter((cat) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      cat.name?.toLowerCase().includes(q) ||
      cat.description?.toLowerCase().includes(q) ||
      cat.slug?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-surface pt-20">
      {/* ── Breadcrumb Strip ──────────────────────────────────────────────── */}
      <div className="w-full bg-surface-container-low shadow-sm border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-sm flex items-center justify-between">
          <nav className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
            <Link to="/" className="hover:text-secondary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-base">home</span>
              <span>Home</span>
            </Link>
            <span className="material-symbols-outlined text-sm text-outline-variant">chevron_right</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Categories</span>
          </nav>
          <Link
            to="/browse"
            className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
          >
            <span>View All Listings</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-surface-container-lowest to-surface py-12 px-margin md:px-margin-md lg:px-margin-lg border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-semibold mb-4 shadow-sm">
            <span className="material-symbols-outlined text-base">category</span>
            <span>Campus Catalog</span>
          </div>
          <h1 className="font-headline-xl text-3xl md:text-4xl text-on-surface font-bold tracking-tight mb-3">
            Explore Campus Categories
          </h1>
          <p className="font-body-md text-on-surface-variant max-w-xl mb-6">
            Browse student-to-student listings by faculty gear, electronics, textbooks, hostel essentials, and transport.
          </p>

          {/* Search within categories */}
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              search
            </span>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter categories (e.g. books, laptops, dorm)..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface-container-lowest text-on-surface font-body-md text-sm border border-outline-variant/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Categories Grid ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-level1 animate-pulse flex flex-col gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-surface-container" />
                <div className="h-6 w-3/4 rounded bg-surface-container" />
                <div className="h-4 w-full rounded bg-surface-container" />
                <div className="h-4 w-2/3 rounded bg-surface-container" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <span className="material-symbols-outlined text-5xl text-error">error</span>
            <p className="font-headline-md text-on-surface">{error}</p>
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-headline-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/50">
              search_off
            </span>
            <h3 className="font-headline-md text-on-surface">No categories match "{filterText}"</h3>
            <p className="font-body-md text-on-surface-variant">
              Try searching with a different term.
            </p>
            <button
              onClick={() => setFilterText('')}
              type="button"
              className="mt-2 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-sm"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((cat) => {
              const count = categoryCounts[cat.slug] || 0;
              return (
                <Link
                  key={cat._id || cat.slug}
                  to={`/browse?category=${cat.slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-level1 hover:shadow-level2 hover:border-secondary/40 transition-all duration-200"
                >
                  <div>
                    {/* Header: Icon + Count */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:bg-secondary group-hover:text-on-secondary transition-all duration-200">
                        <span className="material-symbols-outlined text-2xl">
                          {cat.icon || 'category'}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant group-hover:bg-secondary-container group-hover:text-on-secondary-container transition-colors">
                        {count} {count === 1 ? 'listing' : 'listings'}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h2 className="font-headline-lg text-lg font-bold text-on-surface group-hover:text-secondary transition-colors mb-1.5">
                      {cat.name}
                    </h2>
                    <p className="font-body-sm text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                      {cat.description || 'Explore available student listings in this category.'}
                    </p>
                  </div>

                  {/* Footer link */}
                  <div className="mt-6 pt-4 border-t border-outline-variant/15 flex items-center justify-between text-xs font-semibold text-secondary group-hover:translate-x-0.5 transition-transform">
                    <span>Browse {cat.name}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
