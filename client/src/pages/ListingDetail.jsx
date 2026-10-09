import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getListingById,
  createConversation,
  submitReport,
  claimListing,
  releaseClaim,
  getSimilarListings,
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { cn } from '../utils/cn';
import { Modal } from '../components/ui/Modal';
import { ListingCard } from '../components/ui/ListingCard';

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
  const { isFavorited, toggle } = useFavorites();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [similarListings, setSimilarListings] = useState([]);

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

    getSimilarListings(id, { limit: 4 })
      .then((res) => {
        if (!cancelled) {
          setSimilarListings(res.data?.similar || []);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const [messagingLoading, setMessagingLoading] = useState(false);

  const handleMessage = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!listing) return;
    setMessagingLoading(true);
    try {
      const data = await createConversation(listing._id);
      const convId = data.conversation?._id;
      navigate(convId ? `/messages?conversation=${convId}` : '/messages');
    } catch (err) {
      // If 400 (own listing), just go to messages list
      navigate('/messages');
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!listing) return;
    setClaimLoading(true);
    setClaimError('');
    try {
      const res = await claimListing(listing._id);
      const convId = res.data?.conversationId;
      // Update local listing state so UI reflects claimed status immediately
      setListing((prev) => ({ ...prev, status: 'claimed', claimedBy: { _id: user._id } }));
      navigate(convId ? `/messages?conversation=${convId}` : '/messages');
    } catch (err) {
      setClaimError(err.message || 'Could not claim this item. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleReleaseClaim = async () => {
    if (!listing) return;
    setClaimLoading(true);
    setClaimError('');
    try {
      await releaseClaim(listing._id);
      setListing((prev) => ({ ...prev, status: 'active', claimedBy: null }));
    } catch (err) {
      setClaimError(err.message || 'Could not release claim. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  };

  const saved = listing ? isFavorited(listing._id) : false;

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (toggling || !listing) return;
    setToggling(true);
    try { await toggle(listing._id); } catch { /**/ }
    finally { setToggling(false); }
  };

  const handleOpenReport = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setReportError('');
    setReportSubmitted(false);
    setReportDetails('');
    setReportReason('spam');
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!listing) return;
    setReportSubmitting(true);
    setReportError('');
    try {
      await submitReport({
        targetType: 'listing',
        targetId: listing._id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSubmitted(false);
      }, 2000);
    } catch (err) {
      setReportError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
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
    budgetMin,
    budgetMax,
    urgency,
    condition,
    campus,
    meetupSpots,
    images,
    sellerId,
    categoryId,
    viewCount,
    createdAt,
    status,
    claimedBy,
  } = listing;

  const isClaimed = status === 'claimed';
  const isClaimer = isClaimed && user && claimedBy && (claimedBy._id || claimedBy) === user._id;

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
                <span className={cn('w-1.5 h-1.5 rounded-full', status === 'fulfilled' ? 'bg-amber-500' : 'bg-secondary')} />
                {status === 'active' ? ' Live Listing' : status === 'fulfilled' ? ' Fulfilled' : ` ${status}`}
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
                  ) : listingType === 'wanted' ? (
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined text-4xl">campaign</span>
                      </div>
                      <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">Campus Wanted Request</p>
                      <p className="font-body-sm text-body-sm max-w-xs text-on-surface-variant">
                        A student is actively looking to acquire this item. Got one? Reach out below!
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-6xl">image_not_supported</span>
                      <p className="font-body-md text-body-md">No photos uploaded</p>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-space-md left-space-md flex flex-wrap gap-space-xs z-10">
                    {listingType === 'wanted' ? (
                      <span className="px-space-sm py-space-2xs rounded-full bg-amber-600 text-white font-label-sm text-label-sm shadow-sm flex items-center gap-space-2xs">
                        <span className="material-symbols-outlined text-sm">campaign</span>
                        WANTED REQUEST
                      </span>
                    ) : (
                      <span className="px-space-sm py-space-2xs rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm shadow-sm flex items-center gap-space-2xs">
                        <span className="material-symbols-outlined text-sm">sell</span>
                        {TYPE_LABELS[listingType] || listingType}
                      </span>
                    )}
                    {urgency && (
                      <span className="px-space-sm py-space-2xs rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-label-sm text-label-sm capitalize flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-xs">speed</span>
                        {urgency.replace('-', ' ')}
                      </span>
                    )}
                    {condition && listingType !== 'wanted' && (
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

                {/* Price / Target Budget */}
                <div className="flex flex-wrap items-baseline gap-space-md pt-space-xs">
                  {listingType === 'wanted' ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm text-amber-600 uppercase font-semibold tracking-wider">
                        Target Budget
                      </span>
                      <div className="flex items-baseline gap-space-xs">
                        {budgetMax ? (
                          <>
                            <span className="font-body-md text-body-md text-on-surface-variant font-medium">
                              LKR
                            </span>
                            <span className="text-[28px] font-bold text-on-surface tracking-tight tabular-nums">
                              {budgetMin
                                ? `Rs. ${budgetMin.toLocaleString('en-LK')} - ${budgetMax.toLocaleString('en-LK')}`
                                : `Up to Rs. ${budgetMax.toLocaleString('en-LK')}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-[28px] font-bold text-on-surface tracking-tight">
                            Open to Offers
                          </span>
                        )}
                      </div>
                    </div>
                  ) : listingType === 'free' ? (
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
                  {priceMode === 'negotiable' && listingType !== 'wanted' && (
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
                    listingType === 'wanted'
                      ? { label: 'Urgency', value: urgency ? urgency.replace('-', ' ') : 'Flexible', highlight: true }
                      : { label: 'Condition', value: CONDITION_LABELS[condition] || condition || 'N/A', highlight: true },
                    { label: 'Campus', value: campus || '—' },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
                      <span
                        className={cn(
                          'font-headline-sm text-headline-sm capitalize',
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
                  <div className="rounded-lg bg-surface-container-low p-space-md text-center flex flex-col gap-space-sm">
                    <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      This is your listing
                    </p>
                    {isClaimed && listingType === 'free' && (
                      <>
                        <div className="flex items-center justify-center gap-1 text-amber-700 dark:text-amber-300 font-label-sm text-label-sm">
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>Claimed by a student</span>
                        </div>
                        {claimError && (
                          <p className="text-error font-body-sm text-body-sm">{claimError}</p>
                        )}
                        <button
                          onClick={handleReleaseClaim}
                          disabled={claimLoading}
                          type="button"
                          className="w-full h-9 rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 font-headline-sm text-headline-sm hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          <span className={cn('material-symbols-outlined text-base', claimLoading && 'animate-spin')}>
                            {claimLoading ? 'progress_activity' : 'lock_open'}
                          </span>
                          {claimLoading ? 'Releasing…' : 'Release Claim'}
                        </button>
                      </>
                    )}
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Manage it from your dashboard.
                    </p>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center justify-center gap-1 text-secondary font-headline-sm text-headline-sm hover:underline"
                    >
                      Go to Dashboard →
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Claim error */}
                    {claimError && (
                      <p className="text-error font-body-sm text-body-sm text-center">{claimError}</p>
                    )}

                    {listingType === 'free' ? (
                      /* ── Free listing: Claim CTA ────────────────────────── */
                      isClaimed ? (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-space-md text-center">
                          <span className="material-symbols-outlined text-amber-600 text-3xl">lock</span>
                          <p className="font-headline-sm text-headline-sm text-amber-800 dark:text-amber-300 font-semibold mt-1">
                            {isClaimer ? 'You have claimed this item!' : 'Already Claimed'}
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                            {isClaimer
                              ? 'Check your messages to arrange pickup.'
                              : 'Someone else has reserved this free item.'}
                          </p>
                          {isClaimer && (
                            <button
                              onClick={() => navigate('/messages')}
                              className="mt-space-sm inline-flex items-center gap-1 text-secondary font-headline-sm text-headline-sm hover:underline"
                            >
                              Go to Messages →
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleClaim}
                          type="button"
                          disabled={claimLoading}
                          className="w-full h-12 rounded-lg bg-secondary text-on-secondary font-headline-md text-headline-md hover:bg-secondary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                          <span className={cn('material-symbols-outlined', claimLoading && 'animate-spin')}>
                            {claimLoading ? 'progress_activity' : 'volunteer_activism'}
                          </span>
                          {claimLoading ? 'Claiming…' : 'Claim This Item · It\'s Free!'}
                        </button>
                      )
                    ) : (
                      /* ── Regular / wanted: Message CTA ──────────────────── */
                      <button
                        onClick={handleMessage}
                        type="button"
                        disabled={messagingLoading}
                        className="w-full h-12 rounded-lg bg-secondary text-on-secondary font-headline-md text-headline-md hover:bg-secondary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        <span className={cn('material-symbols-outlined', messagingLoading && 'animate-spin')}>
                          {messagingLoading
                            ? 'progress_activity'
                            : listingType === 'wanted'
                            ? 'handshake'
                            : 'chat_bubble'}
                        </span>
                        {messagingLoading
                          ? 'Opening Chat…'
                          : listingType === 'wanted'
                          ? 'I Have This Item · Message Requester'
                          : 'Message Seller'}
                      </button>
                    )}

                    {/* Save + Share */}
                    <div className="flex gap-space-sm">
                      <button
                        onClick={handleSave}
                        disabled={toggling}
                        type="button"
                        className={cn(
                          'flex-1 h-11 rounded-lg border font-headline-sm text-headline-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-60',
                          saved
                            ? 'bg-error/10 border-error/30 text-error'
                            : 'border-outline-variant/30 text-on-surface hover:bg-surface-container'
                        )}
                      >
                        <span className={cn('material-symbols-outlined text-lg', toggling && 'animate-pulse')}>
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
                    {listingType === 'wanted' ? 'Requested by' : 'Listed by'}
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
                      {sellerDomain && (
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

                  {/* View seller profile link */}
                  {sellerId?._id && (
                    <Link
                      to={`/sellers/${sellerId._id}`}
                      className="inline-flex items-center gap-1.5 text-secondary font-label-md text-[13px] font-semibold hover:underline transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      View seller profile
                    </Link>
                  )}

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
                  onClick={handleOpenReport}
                  type="button"
                  className="text-on-surface-variant font-body-sm text-body-sm hover:text-error transition-colors flex items-center gap-1.5 self-start"
                >
                  <span className="material-symbols-outlined text-base">flag</span>
                  Report this listing
                </button>
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

        {/* Similar Listings on Campus */}
        {similarListings.length > 0 && (
          <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg mt-14 pt-8 border-t border-outline-variant/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
                  <span className="text-xs uppercase tracking-wider text-secondary font-semibold">
                    You Might Also Like
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-on-surface">Similar Items on Campus</h2>
              </div>
              {listing?.categoryId && (
                <Link
                  to={`/browse?category=${listing.categoryId.slug || ''}`}
                  className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
                >
                  <span>More in this category</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarListings.map((sim) => (
                <ListingCard key={sim._id} listing={sim} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Listing Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report this Listing"
        subtitle="Help keep our university marketplace safe and trustworthy"
      >
        {reportSubmitted ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-4xl text-secondary">
              check_circle
            </span>
            <p className="font-headline-md text-headline-md text-on-surface">
              Report Submitted
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              Thank you for keeping campus safe. Our moderators will review this listing shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReportSubmit} className="flex flex-col gap-4">
            {reportError && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error font-body-sm text-body-sm">
                {reportError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-medium">
                Reason for reporting
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface-container border border-outline-variant/30 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30"
              >
                <option value="spam">Spam or unwanted advertising</option>
                <option value="inappropriate_content">Inappropriate or offensive content</option>
                <option value="prohibited_item">Prohibited or dangerous item</option>
                <option value="fraud">Suspected scam or counterfeit item</option>
                <option value="misleading_information">Misleading description or condition</option>
                <option value="harassment">Harassment or abusive behavior</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-medium">
                Additional details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Provide additional context to help moderators evaluate..."
                className="w-full p-3 rounded-lg bg-surface-container border border-outline-variant/30 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/30 resize-none"
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant self-end">
                {reportDetails.length}/1000
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportSubmitting}
                className="px-4 py-2 rounded-lg bg-error text-on-error font-headline-sm text-headline-sm hover:bg-error/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {reportSubmitting && (
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                )}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};
