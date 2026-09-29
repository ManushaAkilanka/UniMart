import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getListingById } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const CONDITION_LABELS = {
  new: 'Brand New',
  'like-new': 'Like New',
  'used-good': 'Used · Good',
  'used-fair': 'Used · Fair',
};

const CONDITION_STYLES = {
  new: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  'like-new': 'bg-blue-50 text-blue-700 border border-blue-200/60',
  'used-good': 'bg-amber-50 text-amber-700 border border-amber-200/60',
  'used-fair': 'bg-orange-50 text-orange-700 border border-orange-200/60',
};

const TYPE_LABELS = {
  sale: 'For Sale',
  free: 'FREE · No Cost',
  rent: 'For Rent',
  exchange: 'Exchange',
  wanted: 'Wanted',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const DetailsSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
      <div className="lg:col-span-8 flex flex-col gap-space-xl">
        <div className="w-full aspect-[4/3] bg-surface-container-high rounded-xl" />
        <div className="grid grid-cols-4 gap-space-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] bg-surface-container-high rounded-lg" />
          ))}
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col gap-4">
          <div className="h-4 w-1/3 bg-surface-container-high rounded" />
          <div className="h-7 w-3/4 bg-surface-container-high rounded" />
          <div className="h-6 w-1/4 bg-surface-container-high rounded" />
          <div className="grid grid-cols-4 gap-3 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-surface-container-high rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-4 flex flex-col gap-space-lg">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col gap-4">
          <div className="h-12 w-full bg-surface-container-high rounded-lg" />
          <div className="h-12 w-full bg-surface-container-high rounded-lg" />
          <div className="h-px bg-surface-container-high" />
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-high" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 bg-surface-container-high rounded" />
              <div className="h-3 w-1/3 bg-surface-container-high rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getListingById(id)
      .then((res) => {
        if (!cancelled) {
          setListing(res.data?.listing);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.status === 404 ? 'Listing not found or no longer available.' : err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/messages');
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSaved((s) => !s);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-md lg:px-margin-lg py-space-xl">
        <DetailsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-md lg:px-margin-lg py-24 flex flex-col items-center text-center gap-4">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant">
          sentiment_dissatisfied
        </span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">{error}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
          This item may have been sold, removed, or the link is incorrect.
        </p>
        <Link
          to="/browse"
          className="inline-flex items-center gap-1 px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors"
        >
          <span>Browse other listings</span>
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>
    );
  }

  if (!listing) return null;

  const {
    title,
    description,
    price,
    priceMode,
    listingType,
    condition,
    campus,
    meetupSpots,
    images,
    sellerId,
    categoryId,
    viewCount,
    createdAt,
    status,
  } = listing;

  const sellerName = sellerId?.fullName || 'Student';
  const sellerEmail = sellerId?.email || '';
  const sellerDomain = sellerEmail.split('@')[1] || '';
  const sellerFaculty = sellerId?.faculty || '';
  const sellerCampus = sellerId?.campus || campus || '';
  const sellerVerified = sellerId?.isVerified;
  const sellerAvatar = sellerId?.avatarUrl;

  const isOwner = user && sellerId && (user._id === sellerId._id || user._id === sellerId);

  const timeAgo = (() => {
    if (!createdAt) return '';
    const diff = (Date.now() - new Date(createdAt)) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  })();

  const currentImage = images?.[selectedImage]?.url;

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={currentImage}
            alt={title}
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-surface/80 text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="flex flex-col w-full">
        {/* Breadcrumb */}
        <nav className="w-full bg-surface-container-low px-margin md:px-margin-md lg:px-margin-lg py-space-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
            <ol className="flex items-center flex-wrap gap-space-xs">
              <li>
                <Link to="/" className="hover:text-secondary flex items-center gap-space-2xs transition-colors">
                  <span className="material-symbols-outlined text-sm">home</span>
                  <span>Home</span>
                </Link>
              </li>
              <li className="opacity-40">/</li>
              <li>
                <Link to="/browse" className="hover:text-secondary transition-colors">Browse</Link>
              </li>
              {categoryId?.name && (
                <>
                  <li className="opacity-40">/</li>
                  <li>
                    <Link
                      to={`/browse?category=${categoryId.slug}`}
                      className="hover:text-secondary transition-colors"
                    >
                      {categoryId.name}
                    </Link>
                  </li>
                </>
              )}
              <li className="opacity-40">/</li>
              <li className="font-headline-sm text-headline-sm text-on-surface truncate max-w-xs sm:max-w-sm">
                {title}
              </li>
            </ol>
            <div className="hidden sm:flex items-center gap-space-sm">
              <span className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-full bg-surface-container font-code-sm text-code-sm text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                {status === 'active' ? ' Live Listing' : ` ${status}`}
              </span>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-md lg:px-margin-lg py-space-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">

            {/* ── LEFT COLUMN: Gallery + Info ──────────────────────────────── */}
            <section className="lg:col-span-8 flex flex-col gap-space-xl">

              {/* Gallery */}
              <div className="flex flex-col gap-space-md">
                {/* Main image */}
                <div
                  className="relative w-full rounded-xl overflow-hidden bg-surface-container shadow-md aspect-[4/3] flex items-center justify-center group cursor-zoom-in"
                  onClick={() => images?.length > 0 && setLightboxOpen(true)}
                >
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-6xl">image_not_supported</span>
                      <p className="font-body-md text-body-md">No photos uploaded</p>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-space-md left-space-md flex flex-wrap gap-space-xs z-10">
                    <span className="px-space-sm py-space-2xs rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm shadow-sm flex items-center gap-space-2xs">
                      <span className="material-symbols-outlined text-sm">sell</span>
                      {TYPE_LABELS[listingType] || listingType}
                    </span>
                    {condition && (
                      <span
                        className={cn(
                          'px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm shadow-sm backdrop-blur-sm',
                          CONDITION_STYLES[condition] || 'bg-surface-container-highest text-on-surface'
                        )}
                      >
                        {CONDITION_LABELS[condition] || condition}
                      </span>
                    )}
                  </div>

                  {/* Zoom hint */}
                  {images?.length > 0 && (
                    <div className="absolute bottom-space-md right-space-md bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-space-2xs rounded-lg shadow-sm font-code-sm text-code-sm text-on-surface flex items-center gap-space-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm">open_in_full</span>
                      <span>Click to expand</span>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {images?.length > 1 && (
                  <div className="grid grid-cols-4 gap-space-sm">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={cn(
                          'relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-container shadow-sm focus:outline-none transition-all duration-200',
                          idx === selectedImage
                            ? 'ring-2 ring-secondary ring-offset-2 ring-offset-surface'
                            : 'opacity-60 hover:opacity-100'
                        )}
                      >
                        <img
                          src={img.url}
                          alt={`View ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info card */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                {/* Meta row */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    {sellerVerified && (
                      <span className="inline-flex items-center gap-1 text-secondary bg-secondary-container/40 text-on-secondary-container px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        University Email Verified
                      </span>
                    )}
                    {(sellerFaculty || sellerCampus) && (
                      <span className="inline-flex items-center gap-1 text-on-surface-variant bg-surface-container px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-sm">school</span>
                        {sellerFaculty || sellerCampus}
                      </span>
                    )}
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-2xs">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    Posted {timeAgo}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-snug">
                    {title}
                  </h1>
                  {description && (
                    <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="flex flex-wrap items-baseline gap-space-md pt-space-xs">
                  {listingType === 'free' ? (
                    <span className="text-[28px] font-bold text-secondary leading-tight">FREE</span>
                  ) : (
                    <div className="flex items-baseline gap-space-xs">
                      <span className="font-body-md text-body-md text-on-surface-variant font-medium">
                        LKR
                      </span>
                      <span className="text-[28px] font-bold text-on-surface tracking-tight tabular-nums">
                        Rs.&nbsp;{price?.toLocaleString('en-LK')}
                      </span>
                    </div>
                  )}
                  {priceMode === 'negotiable' && (
                    <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md">
                      Negotiable on Handover
                    </span>
                  )}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-md mt-space-xs bg-surface-container-low p-space-sm rounded-lg">
                  {[
                    { label: 'Category', value: categoryId?.name || '—' },
                    { label: 'Total Views', value: viewCount != null ? `${viewCount} views` : '—' },
                    { label: 'Condition', value: CONDITION_LABELS[condition] || condition || 'N/A', highlight: true },
                    { label: 'Campus', value: campus || '—' },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
                      <span
                        className={cn(
                          'font-headline-sm text-headline-sm',
                          highlight ? 'text-secondary font-semibold' : 'text-on-surface'
                        )}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meetup Guidelines */}
              {(meetupSpots?.length > 0 || campus) && (
                <div className="bg-secondary-container/10 border border-secondary/20 rounded-xl p-space-lg flex flex-col gap-space-md">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary">handshake</span>
                    Safe Campus Meetup Guidelines
                  </h2>
                  {meetupSpots?.length > 0 && (
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 font-semibold">
                        Suggested Spots
                      </p>
                      <div className="flex flex-wrap gap-space-xs">
                        {meetupSpots.map((spot, idx) => (
                          <span
                            key={idx}
                            className="px-space-sm py-1 bg-surface-container-lowest rounded-lg font-code-sm text-code-sm text-on-surface border border-outline-variant/20"
                          >
                            📍 {spot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <ul className="flex flex-col gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                    {[
                      'Meet only during daylight hours in public campus spaces',
                      'Library lobbies, canteen queues, and faculty reception areas are safest',
                      'Never share personal banking details or transfer money upfront',
                      'Inspect the item thoroughly before completing the exchange',
                    ].map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-secondary text-sm mt-0.5 shrink-0">
                          check_circle
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ── RIGHT COLUMN: Actions + Seller card ─────────────────────── */}
            <aside className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-28">
              {/* Action buttons */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
                {isOwner ? (
                  <div className="rounded-lg bg-surface-container-low p-space-md text-center">
                    <p className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                      This is your listing
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Manage it from your dashboard.
                    </p>
                    <Link
                      to="/dashboard"
                      className="mt-space-sm inline-flex items-center gap-1 text-secondary font-headline-sm text-headline-sm hover:underline"
                    >
                      Go to Dashboard →
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Message Seller CTA */}
                    <button
                      onClick={handleMessage}
                      type="button"
                      className="w-full h-12 rounded-lg bg-secondary text-on-secondary font-headline-md text-headline-md hover:bg-secondary/90 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">chat_bubble</span>
                      Message Seller
                    </button>

                    {/* Save + Share */}
                    <div className="flex gap-space-sm">
                      <button
                        onClick={handleSave}
                        type="button"
                        className={cn(
                          'flex-1 h-11 rounded-lg border font-headline-sm text-headline-sm flex items-center justify-center gap-1.5 transition-all',
                          saved
                            ? 'bg-error/10 border-error/30 text-error'
                            : 'border-outline-variant/30 text-on-surface hover:bg-surface-container'
                        )}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {saved ? 'favorite' : 'favorite_border'}
                        </span>
                        {saved ? 'Saved' : 'Save'}
                      </button>

                      <button
                        onClick={handleShare}
                        type="button"
                        className="flex-1 h-11 rounded-lg border border-outline-variant/30 text-on-surface font-headline-sm text-headline-sm flex items-center justify-center gap-1.5 hover:bg-surface-container transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {copied ? 'check' : 'share'}
                        </span>
                        {copied ? 'Copied!' : 'Share'}
                      </button>
                    </div>
                  </>
                )}

                <div className="h-px bg-outline-variant/20" />

                {/* Seller card */}
                <div className="flex flex-col gap-space-md">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold uppercase tracking-wider text-on-surface-variant">
                    Listed by
                  </h3>
                  <div className="flex items-center gap-space-md">
                    <div className="relative shrink-0">
                      {sellerAvatar ? (
                        <img
                          src={sellerAvatar}
                          alt={sellerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-2xl">person</span>
                        </div>
                      )}
                      {sellerVerified && (
                        <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-secondary text-sm bg-surface rounded-full">
                          verified
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                        {sellerName}
                      </span>
                      {sellerEmail && (
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          @{sellerDomain}
                        </span>
                      )}
                      {sellerFaculty && (
                        <span className="font-code-sm text-code-sm text-secondary font-medium">
                          {sellerFaculty}
                        </span>
                      )}
                    </div>
                  </div>

                  {sellerVerified && (
                    <div className="flex items-start gap-2 p-space-sm rounded-lg bg-secondary-container/20 border border-secondary/20">
                      <span className="material-symbols-outlined text-secondary text-sm mt-0.5 shrink-0">
                        shield
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Verified via <strong>@{sellerDomain}</strong> university email. All trades
                        are peer-reviewed and campus-local.
                      </p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-outline-variant/20" />

                {/* Report */}
                <button
                  onClick={() => setReportVisible((v) => !v)}
                  type="button"
                  className="text-on-surface-variant font-body-sm text-body-sm hover:text-error transition-colors flex items-center gap-1 self-start"
                >
                  <span className="material-symbols-outlined text-sm">flag</span>
                  Report this listing
                </button>

                {reportVisible && (
                  <div className="rounded-lg bg-error/5 border border-error/20 p-space-sm text-[13px] text-on-surface-variant">
                    Reporting will be available soon. For urgent issues, contact{' '}
                    <strong>support@unimart.lk</strong>.
                  </div>
                )}
              </div>

              {/* Safety reminder card */}
              <div className="bg-surface-container-low rounded-xl p-space-md flex gap-space-sm border border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-2xl shrink-0 mt-0.5">
                  shield_with_house
                </span>
                <div>
                  <p className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                    Campus Safety Reminder
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Always meet in public, daylight campus spaces. Inspect items before paying. Never
                    transfer money digitally to strangers.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};
