import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const LISTING_TYPES = [
  {
    value: 'sale',
    label: 'For Sale',
    description: 'Normal student cash or bank transfer trade',
    icon: 'payments',
  },
  {
    value: 'free',
    label: 'Free Giveaway',
    description: 'Mutual aid · Passing on to juniors at no cost',
    icon: 'volunteer_activism',
  },
  {
    value: 'wanted',
    label: 'Wanted / Request',
    description: 'Looking to acquire this item or borrow notes',
    icon: 'campaign',
  },
  {
    value: 'rent',
    label: 'For Rent / Borrow',
    description: 'Short-term single exam or semester duration',
    icon: 'schedule',
  },
  {
    value: 'exchange',
    label: 'Exchange / Swap',
    description: 'Barter for other textbooks or electronics',
    icon: 'swap_horiz',
  },
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New', sub: 'Unopened / with tags' },
  { value: 'like-new', label: 'Like New', sub: 'Used 1-2 times' },
  { value: 'used-good', label: 'Good', sub: 'Fully operational' },
  { value: 'used-fair', label: 'Fair', sub: 'Cosmetic signs of use' },
];

const DEFAULT_MEETUP_SPOTS = [
  'Main Library Steps',
  'Faculty of Science Quad',
  'Student Union Canteen',
  'UCSC Ground Floor Lobby',
  'Reid Avenue Security Gate',
  'Arts Faculty Pavilion',
];

export const ListingForm = ({
  initialData = null,
  isEditing = false,
  onSubmit,
  loading = false,
  error = null,
}) => {
  const { user } = useAuth();

  // Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId?._id || initialData?.categoryId || ''
  );
  const [listingType, setListingType] = useState(initialData?.listingType || 'sale');
  const [price, setPrice] = useState(
    initialData?.price !== undefined ? initialData.price.toString() : ''
  );
  const [budgetMin, setBudgetMin] = useState(
    initialData?.budgetMin !== undefined ? initialData.budgetMin.toString() : ''
  );
  const [budgetMax, setBudgetMax] = useState(
    initialData?.budgetMax !== undefined ? initialData.budgetMax.toString() : (initialData?.price ? initialData.price.toString() : '')
  );
  const [urgency, setUrgency] = useState(initialData?.urgency || 'flexible');
  const [priceMode, setPriceMode] = useState(initialData?.priceMode || 'fixed');
  const [condition, setCondition] = useState(initialData?.condition || 'used-good');
  const [campus, setCampus] = useState(initialData?.campus || user?.campus || 'University of Colombo');
  const [selectedSpots, setSelectedSpots] = useState(initialData?.meetupSpots || ['Main Library Steps']);
  const [customSpotInput, setCustomSpotInput] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Images state: array of items: { id, file, url, publicId, isExisting }
  const [images, setImages] = useState(() => {
    if (initialData?.images && Array.isArray(initialData.images)) {
      return initialData.images.map((img, idx) => ({
        id: `existing-${idx}-${Date.now()}`,
        url: img.url,
        publicId: img.publicId,
        isExisting: true,
      }));
    }
    return [];
  });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const descriptionRef = useRef(null);

  // Load categories
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((res) => {
        if (!cancelled) {
          const list = res.data?.categories || [];
          setCategories(list);
          setCategoriesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Update when initialData changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setCategoryId(initialData.categoryId?._id || initialData.categoryId || '');
      setListingType(initialData.listingType || 'sale');
      setPrice(initialData.price !== undefined ? initialData.price.toString() : '');
      setPriceMode(initialData.priceMode || 'fixed');
      setCondition(initialData.condition || 'used-good');
      setCampus(initialData.campus || user?.campus || 'University of Colombo');
      setSelectedSpots(initialData.meetupSpots || ['Main Library Steps']);
      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(
          initialData.images.map((img, idx) => ({
            id: `existing-${idx}-${Date.now()}`,
            url: img.url,
            publicId: img.publicId,
            isExisting: true,
          }))
        );
      }
    }
  }, [initialData, user]);

  // Image handling
  const handleFiles = (files) => {
    setUploadError(null);
    const newFiles = Array.from(files);
    const totalCount = images.length + newFiles.length;

    if (totalCount > 6) {
      setUploadError(`Maximum 6 images allowed. You can only add ${6 - images.length} more.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5 MB

    const processed = [];
    for (const file of newFiles) {
      if (!validTypes.includes(file.type)) {
        setUploadError(`"${file.name}" has an unsupported format. Please use JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > maxSize) {
        setUploadError(`"${file.name}" exceeds 5 MB. Please compress your image.`);
        return;
      }
      processed.push({
        id: `file-${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        isExisting: false,
      });
    }

    setImages((prev) => [...prev, ...processed]);
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => {
      const removed = prev[indexToRemove];
      if (removed && !removed.isExisting && removed.url) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const makePrimaryCover = (index) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const moveImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Meetup spots toggle
  const toggleSpot = (spot) => {
    setSelectedSpots((prev) =>
      prev.includes(spot) ? prev.filter((s) => s !== spot) : [...prev, spot]
    );
  };

  const addCustomSpot = (e) => {
    e.preventDefault();
    const trimmed = customSpotInput.trim();
    if (trimmed && !selectedSpots.includes(trimmed)) {
      setSelectedSpots((prev) => [...prev, trimmed]);
      setCustomSpotInput('');
    }
  };

  // Textarea helpers
  const insertText = (prefix, suffix = '') => {
    if (!descriptionRef.current) return;
    const el = descriptionRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || 'detail'}${suffix}`;
    const nextVal = current.substring(0, start) + replacement + current.substring(end);
    setDescription(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 6));
    }, 0);
  };

  // Validation mirroring server Zod schemas
  const validate = () => {
    const errors = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (title.trim().length > 120) {
      errors.title = 'Title must not exceed 120 characters';
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (description.trim().length > 2000) {
      errors.description = 'Description must not exceed 2000 characters';
    }

    if (!categoryId) {
      errors.categoryId = 'Please select a primary category';
    }

    if (!listingType) {
      errors.listingType = 'Please select a listing type';
    }

    if (listingType !== 'wanted') {
      if (images.length === 0) {
        errors.images = 'Please upload at least 1 photo of the item';
      }

      if (listingType !== 'free') {
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          errors.price = 'Please enter a valid asking price greater than 0';
        }
      }

      if (!condition) {
        errors.condition = 'Condition is required for items being listed';
      }
    }

    if (!campus.trim()) {
      errors.campus = 'Campus location is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to top of form
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    // Build payload using FormData
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('categoryId', categoryId);
    formData.append('listingType', listingType);
    formData.append('currency', 'LKR');
    formData.append('campus', campus.trim());
    formData.append('meetupSpots', JSON.stringify(selectedSpots));

    if (listingType === 'wanted') {
      const bMin = parseFloat(budgetMin) || 0;
      const bMax = parseFloat(budgetMax) || parseFloat(price) || 0;
      formData.append('budgetMin', bMin);
      formData.append('budgetMax', bMax);
      formData.append('price', bMax);
      formData.append('urgency', urgency);
      formData.append('images', JSON.stringify([]));
    } else {
      formData.append('price', listingType === 'free' ? 0 : parseFloat(price) || 0);
      formData.append('priceMode', priceMode);
      formData.append('condition', condition);

      // Separate existing images from newly uploaded files
      const existingImages = images.filter((img) => img.isExisting).map((img) => ({
        url: img.url,
        publicId: img.publicId,
      }));
      formData.append('images', JSON.stringify(existingImages));

      // Append raw files for multer
      images.forEach((img) => {
        if (!img.isExisting && img.file) {
          formData.append('images', img.file);
        }
      });
    }

    await onSubmit(formData);
  };

  // Find selected category name for preview
  const currentCategory = categories.find((c) => c._id === categoryId);

  return (
    <div className="flex flex-col w-full">
      {/* ── Sub-header / Stepper ────────────────────────────────────────── */}
      <section className="w-full bg-surface-container-lowest shadow-sm border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div>
              <nav
                aria-label="Breadcrumbs"
                className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant mb-2"
              >
                <Link to="/" className="hover:text-on-surface transition-colors">
                  Home
                </Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <Link to="/my-listings" className="hover:text-on-surface transition-colors">
                  My Listings
                </Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-on-surface font-semibold">
                  {isEditing ? 'Edit Listing' : 'Post a Campus Listing'}
                </span>
              </nav>
              <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight">
                {isEditing ? 'Update Campus Listing' : 'Create a Campus Listing'}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
                {isEditing
                  ? 'Keep details, photos, and meetup locations accurate for fellow students.'
                  : 'Sell, swap, or pass down items directly to undergrads at your university.'}
              </p>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg self-start md:self-auto border border-outline-variant/20">
              <span className="material-symbols-outlined text-secondary text-base">savings</span>
              <span className="font-body-sm text-body-sm text-on-surface">
                <strong className="font-semibold">0% platform fees:</strong> Keep 100% of proceeds
              </span>
            </div>
          </div>

          {/* Stepper Guide */}
          <div className="mt-space-lg pt-space-xs">
            <ol className="grid grid-cols-2 md:grid-cols-5 gap-space-xs md:gap-space-sm font-label-sm text-label-sm">
              <li className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary shrink-0 text-xs font-bold">
                  1
                </span>
                <span className="truncate font-medium">Photos ({images.length}/6)</span>
              </li>
              <li className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary shrink-0 text-xs font-bold">
                  2
                </span>
                <span className="truncate font-medium">Item Details</span>
              </li>
              <li className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary shrink-0 text-xs font-bold">
                  3
                </span>
                <span className="truncate font-medium">Pricing</span>
              </li>
              <li className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary shrink-0 text-xs font-bold">
                  4
                </span>
                <span className="truncate font-medium">Campus Meetup</span>
              </li>
              <li className="col-span-2 md:col-span-1 flex items-center gap-space-xs p-space-xs rounded-lg bg-secondary-container/30 text-secondary font-semibold">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary shrink-0 text-xs font-bold">
                  5
                </span>
                <span className="truncate">Live Preview</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── Main Form + Sticky Sidebar Grid ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-xl w-full">
        {error && (
          <div className="mb-space-lg p-space-md rounded-xl bg-error-container text-on-error-container border border-error/30 flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">
              error
            </span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-semibold">Action Failed</span>
              <span className="font-body-sm text-body-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* ── LEFT COLUMN: 8 COLS ────────────────────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-space-xl">
            {/* ── SECTION 1: PHOTOS (Hidden for Wanted Requests) ───────────── */}
            {listingType !== 'wanted' && (
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-container text-on-surface font-semibold text-xs">
                      01
                    </span>
                    <div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">
                        Photos & Visual Inspection
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Upload up to 6 clear daylight photos. The first image serves as the primary cover.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container/40 text-secondary font-label-sm text-label-sm font-semibold">
                    {images.length} / 6 Uploaded
                  </span>
                </div>

                {uploadError && (
                  <div className="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>{uploadError}</span>
                  </div>
                )}

                {validationErrors.images && (
                  <div className="p-space-sm rounded-lg bg-error/10 border border-error/20 text-error font-body-sm text-body-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{validationErrors.images}</span>
                  </div>
                )}

              {/* Drag & Drop Area */}
              {images.length < 6 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative group cursor-pointer rounded-xl p-space-lg flex flex-col items-center justify-center text-center transition-all border-2 border-dashed',
                    dragOver
                      ? 'border-secondary bg-secondary-container/20'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container hover:border-secondary/60'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files) handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-secondary mb-space-xs group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Drag & drop photos here, or{' '}
                    <span className="text-secondary underline underline-offset-2">browse files</span>
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-md">
                    JPG, PNG, WebP up to 5MB each. Capture daylight photos showcasing front, back, and any accessories.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-space-sm mt-space-sm font-label-sm text-label-sm text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-secondary">verified</span> Real Camera Capture
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-secondary">flash_off</span> Natural Daylight
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-secondary">aspect_ratio</span> 4:3 Aspect Recommended
                    </span>
                  </div>
                </div>
              )}

              {/* Uploaded Thumbnails Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm pt-space-xs">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className={cn(
                        'relative group rounded-xl overflow-hidden bg-surface-container shadow-sm aspect-[4/3] border',
                        idx === 0 ? 'border-secondary ring-2 ring-secondary/30' : 'border-outline-variant/30'
                      )}
                    >
                      <img src={img.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />

                      {/* Primary Cover Badge */}
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[10px] font-bold shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>{' '}
                          Cover
                        </span>
                      )}

                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => makePrimaryCover(idx)}
                            className="p-1.5 rounded-full bg-surface-container-lowest text-on-surface hover:bg-secondary hover:text-on-secondary transition-colors shadow"
                            title="Set as Primary Cover"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">star</span>
                          </button>
                        )}
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, -1)}
                            className="p-1.5 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface transition-colors shadow"
                            title="Move Left"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">chevron_left</span>
                          </button>
                        )}
                        {idx < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 1)}
                            className="p-1.5 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface transition-colors shadow"
                            title="Move Right"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">chevron_right</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="p-1.5 rounded-full bg-surface-container-lowest text-error hover:bg-error hover:text-white transition-colors shadow"
                          title="Delete photo"
                        >
                          <span className="material-symbols-outlined text-sm leading-none">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

            {/* ── SECTION 2: ITEM CLASSIFICATION & TITLE ──────────────────── */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-container text-on-surface font-semibold text-xs">
                  02
                </span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">
                    Item Classification & Title
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Accurate details help students searching by semester code, syllabus, or department.
                  </p>
                </div>
              </div>

              {/* Title Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="title-input">
                    Listing Title <span className="text-error">*</span>
                  </label>
                  <span
                    className={cn(
                      'font-code-sm text-code-sm',
                      title.length > 90 ? 'text-error font-semibold' : 'text-on-surface-variant'
                    )}
                  >
                    {title.length} / 120
                  </span>
                </div>
                <input
                  id="title-input"
                  type="text"
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Casio fx-991ES Plus Scientific Calculator (Engineering Edition)"
                  className={cn(
                    'w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all',
                    validationErrors.title ? 'border-error' : 'border-outline-variant/30'
                  )}
                />
                {validationErrors.title ? (
                  <p className="font-body-sm text-body-sm text-error">{validationErrors.title}</p>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Include brand, exact model number, and faculty suitability (e.g. Science, UCSC, Engineering).
                  </p>
                )}
              </div>

              {/* Category Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="category-select">
                  Primary Category <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={categoriesLoading}
                    className={cn(
                      'w-full h-11 pl-space-md pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md appearance-none border focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all',
                      validationErrors.categoryId ? 'border-error' : 'border-outline-variant/30'
                    )}
                  >
                    <option value="" disabled>
                      {categoriesLoading ? 'Loading campus categories...' : 'Select a category'}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    expand_more
                  </span>
                </div>
                {validationErrors.categoryId && (
                  <p className="font-body-sm text-body-sm text-error">{validationErrors.categoryId}</p>
                )}
              </div>

              {/* Listing Intent / Type */}
              <div className="flex flex-col gap-2 pt-space-xs">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Listing Intent / Type <span className="text-error">*</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-xs">
                  {LISTING_TYPES.map((type) => {
                    const isSelected = listingType === type.value;
                    return (
                      <label
                        key={type.value}
                        className={cn(
                          'relative flex items-start gap-space-xs p-space-sm rounded-lg cursor-pointer transition-all border',
                          isSelected
                            ? 'bg-secondary-container/20 border-secondary ring-1 ring-secondary shadow-sm'
                            : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container'
                        )}
                      >
                        <input
                          type="radio"
                          name="listing_type"
                          value={type.value}
                          checked={isSelected}
                          onChange={() => setListingType(type.value)}
                          className="mt-1 accent-secondary"
                        />
                        <div className="min-w-0">
                          <span className="font-headline-sm text-headline-sm text-on-surface block font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-base text-secondary">{type.icon}</span>
                            <span>{type.label}</span>
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                            {type.description}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Condition Picker (hidden if type is wanted) */}
              {listingType !== 'wanted' && (
                <div className="flex flex-col gap-2 pt-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Item Condition <span className="text-error">*</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs bg-surface-container-low p-1 rounded-xl border border-outline-variant/20">
                    {CONDITIONS.map((cond) => {
                      const isSelected = condition === cond.value;
                      return (
                        <label
                          key={cond.value}
                          className={cn(
                            'flex flex-col items-center text-center p-space-sm rounded-lg cursor-pointer transition-all',
                            isSelected
                              ? 'bg-surface-container-lowest text-secondary font-semibold shadow-sm'
                              : 'hover:bg-surface-container-lowest/60 text-on-surface'
                          )}
                        >
                          <input
                            type="radio"
                            name="condition"
                            value={cond.value}
                            checked={isSelected}
                            onChange={() => setCondition(cond.value)}
                            className="sr-only"
                          />
                          <span className="font-headline-sm text-headline-sm">{cond.label}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{cond.sub}</span>
                        </label>
                      );
                    })}
                  </div>
                  {validationErrors.condition && (
                    <p className="font-body-sm text-body-sm text-error">{validationErrors.condition}</p>
                  )}
                </div>
              )}
            </section>

            {/* ── SECTION 3: PRICING & NEGOTIATION ────────────────────────── */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-container text-on-surface font-semibold text-xs">
                  {listingType === 'wanted' ? '02' : '03'}
                </span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">
                    {listingType === 'wanted' ? 'Budget & Urgency' : 'Pricing & Negotiation Mode'}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {listingType === 'wanted'
                      ? 'Specify your target budget (optional) and timeframe so peers can respond accordingly.'
                      : 'Set transparent student pricing in Sri Lankan Rupees (LKR).'}
                  </p>
                </div>
              </div>

              {listingType === 'free' ? (
                <div className="p-space-md rounded-lg bg-secondary-container/20 border border-secondary/30 flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary text-2xl">volunteer_activism</span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      100% Free Giveaway Item
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      No payment will be requested. This listing will automatically appear in the Campus Free Pool.
                    </span>
                  </div>
                </div>
              ) : listingType === 'wanted' ? (
                <div className="flex flex-col gap-space-md">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-start">
                    {/* Budget Max */}
                    <div className="md:col-span-6 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="budget-input">
                          Target Budget <span className="font-body-sm text-on-surface-variant text-xs">(Optional)</span>
                        </label>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 font-headline-sm text-headline-sm text-on-surface-variant font-semibold select-none">
                          LKR (Rs.)
                        </span>
                        <input
                          id="budget-input"
                          type="number"
                          min="0"
                          step="100"
                          value={budgetMax}
                          onChange={(e) => {
                            setBudgetMax(e.target.value);
                            setPrice(e.target.value);
                          }}
                          placeholder="e.g., 3500 (Open to offers)"
                          className="w-full h-12 pl-24 pr-space-md rounded-lg bg-surface-container-low text-on-surface font-headline-lg text-headline-lg border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
                        />
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Leave blank if you are open to any reasonable student price offers.
                      </p>
                    </div>

                    {/* Urgency / Timeframe */}
                    <div className="md:col-span-6 flex flex-col gap-1.5">
                      <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="urgency-input">
                        Urgency / Timeframe
                      </label>
                      <select
                        id="urgency-input"
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="w-full h-12 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
                      >
                        <option value="urgent">⚡ Urgent — Need within 1-2 days / Exam imminent</option>
                        <option value="this-week">📅 This Week — Need within 7 days</option>
                        <option value="flexible">🌱 Flexible — Anytime this semester</option>
                      </select>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Urgent requests are badged prominently to alert campus peers quickly.
                      </p>
                    </div>
                  </div>

                  <div className="p-space-sm rounded-lg bg-secondary-container/20 border border-secondary/20 flex items-center gap-space-sm text-body-sm text-on-surface">
                    <span className="material-symbols-outlined text-secondary text-lg">info</span>
                    <span>Students with this item can message you directly from this request.</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-start">
                  <div className="md:col-span-6 flex flex-col gap-1.5">
                    <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="price-input">
                      Asking Price <span className="text-error">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 font-headline-sm text-headline-sm text-on-surface-variant font-semibold select-none">
                        LKR (Rs.)
                      </span>
                      <input
                        id="price-input"
                        type="number"
                        min="0"
                        step="50"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className={cn(
                          'w-full h-12 pl-24 pr-space-md rounded-lg bg-surface-container-low text-on-surface font-headline-lg text-headline-lg border focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all',
                          validationErrors.price ? 'border-error' : 'border-outline-variant/30'
                        )}
                      />
                    </div>
                    {validationErrors.price && (
                      <p className="font-body-sm text-body-sm text-error">{validationErrors.price}</p>
                    )}
                  </div>

                  <div className="md:col-span-6 flex flex-col justify-center h-full pt-1 md:pt-7">
                    <label className="flex items-start gap-space-xs p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/20 cursor-pointer hover:bg-surface-container transition-colors">
                      <input
                        type="checkbox"
                        checked={priceMode === 'negotiable'}
                        onChange={(e) => setPriceMode(e.target.checked ? 'negotiable' : 'fixed')}
                        className="mt-1 w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                      />
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          Price is negotiable for fellow students
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Allows buyers to suggest friendly counter-offers in meetup chat.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Value retention note */}
              <div className="p-space-md rounded-lg bg-secondary-container/20 border border-secondary/20 flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5">handshake</span>
                <div className="font-body-sm text-body-sm text-on-surface">
                  <strong className="font-semibold text-secondary">UniMart 100% Retained Value:</strong> No commissions
                  or platform cuts. You take home 100% of cash or instant peer bank transfers (FriMi, Genie, Q+).
                </div>
              </div>
            </section>

            {/* ── SECTION 4: DESCRIPTION & SPECS ──────────────────────────── */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-container text-on-surface font-semibold text-xs">
                  04
                </span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">
                    Detailed Description & History
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Mention semester use, accessories included, and condition details.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 bg-surface-container-low p-1.5 rounded-t-lg border-t border-x border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => insertText('**', '**')}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors"
                    title="Bold text"
                  >
                    <span className="material-symbols-outlined text-base leading-none">format_bold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertText('*', '*')}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors"
                    title="Italic text"
                  >
                    <span className="material-symbols-outlined text-base leading-none">format_italic</span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant/30 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertText('\n- ')}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors"
                    title="Bullet List"
                  >
                    <span className="material-symbols-outlined text-base leading-none">format_list_bulleted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertText('\n1. ')}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors"
                    title="Numbered List"
                  >
                    <span className="material-symbols-outlined text-base leading-none">format_list_numbered</span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant/30 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertText('\n[Exam Allowed Regulation: Verified non-programmable]')}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-secondary transition-colors text-xs font-semibold px-2"
                  >
                    + Exam Allowed Tag
                  </button>
                </div>

                <textarea
                  ref={descriptionRef}
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your item in full detail: condition, how many semesters used, accessories included, and suitable degree courses..."
                  className={cn(
                    'w-full p-space-md rounded-b-lg bg-surface-container-low text-on-surface font-body-md text-body-md border focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all resize-y',
                    validationErrors.description ? 'border-error' : 'border-outline-variant/30'
                  )}
                />

                <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
                  {validationErrors.description ? (
                    <span className="text-error">{validationErrors.description}</span>
                  ) : (
                    <span>Minimum 10 characters</span>
                  )}
                  <span className="font-code-sm text-code-sm">{description.length} / 2000</span>
                </div>
              </div>
            </section>

            {/* ── SECTION 5: CAMPUS MEETUP & HANDOVER ─────────────────────── */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-container text-on-surface font-semibold text-xs">
                  05
                </span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">
                    Campus Meetup & Handover Protocol
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    UniMart transactions happen safely inside well-lit campus public zones.
                  </p>
                </div>
              </div>

              {/* Campus Selector / Readonly Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Verified University Campus</span>
                  <div className="flex items-center gap-space-xs text-on-surface font-headline-sm text-headline-sm font-semibold">
                    <span className="material-symbols-outlined text-secondary text-base">domain</span>
                    <span>{campus}</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-1 font-medium">
                    <span className="material-symbols-outlined text-xs">verified</span> Campus Community Handoff
                  </span>
                </div>

                <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Primary Safe Zone</span>
                  <div className="flex items-center gap-space-xs text-on-surface font-headline-sm text-headline-sm font-semibold">
                    <span className="material-symbols-outlined text-secondary text-base">pin_drop</span>
                    <span>Library & Student Canteens</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Daylight hours recommended for inspection
                  </span>
                </div>
              </div>

              {/* Meetup Spots (Clickable Chips) */}
              <div className="flex flex-col gap-2 pt-space-xs">
                <label className="font-headline-sm text-headline-sm text-on-surface">
                  Preferred Public Handover Spots <span className="font-body-sm text-body-sm text-on-surface-variant">(Select all that work)</span>
                </label>
                <div className="flex flex-wrap gap-space-xs">
                  {DEFAULT_MEETUP_SPOTS.map((spot) => {
                    const isSelected = selectedSpots.includes(spot);
                    return (
                      <button
                        key={spot}
                        type="button"
                        onClick={() => toggleSpot(spot)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full font-headline-sm text-headline-sm transition-all shadow-sm border',
                          isSelected
                            ? 'bg-secondary text-on-secondary border-secondary'
                            : 'bg-surface-container-high text-on-surface border-outline-variant/20 hover:bg-surface-container-highest'
                        )}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isSelected ? 'check' : 'add'}
                        </span>
                        <span>{spot}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom spots added */}
                {selectedSpots.filter((s) => !DEFAULT_MEETUP_SPOTS.includes(s)).length > 0 && (
                  <div className="flex flex-wrap gap-space-xs pt-2">
                    <span className="text-xs font-semibold text-on-surface-variant self-center">Custom:</span>
                    {selectedSpots
                      .filter((s) => !DEFAULT_MEETUP_SPOTS.includes(s))
                      .map((spot) => (
                        <span
                          key={spot}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold"
                        >
                          <span>{spot}</span>
                          <button
                            type="button"
                            onClick={() => toggleSpot(spot)}
                            className="hover:opacity-75"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">close</span>
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Add custom spot */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={customSpotInput}
                    onChange={(e) => setCustomSpotInput(e.target.value)}
                    placeholder="Add custom campus spot (e.g. UCSC Cafeteria, Science Hostel)"
                    className="flex-1 h-9 px-space-sm rounded-lg bg-surface-container-low text-on-surface text-body-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <button
                    type="button"
                    onClick={addCustomSpot}
                    className="px-space-md h-9 rounded-lg bg-surface-container text-on-surface font-headline-sm text-body-sm hover:bg-surface-container-high transition-colors"
                  >
                    Add Spot
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN: STICKY SIDEBAR (4 COLS) ──────────────────────── */}
          <aside className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-24 h-fit">
            {/* Live Instant Preview Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md border border-outline-variant/20 flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                  Instant Card Preview
                </span>
                <span className="flex items-center gap-1.5 font-code-sm text-code-sm text-secondary font-medium">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Live Preview
                </span>
              </div>

              {/* Card visual */}
              <div className="rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/20 shadow-sm flex flex-col">
                <div className="relative aspect-[4/3] bg-surface-container-high overflow-hidden">
                  {listingType === 'wanted' ? (
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 flex flex-col items-center justify-center p-4 text-center border-b border-amber-200/50">
                      <div className="w-12 h-12 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center mb-2 shadow-sm">
                        <span className="material-symbols-outlined text-2xl">campaign</span>
                      </div>
                      <span className="font-headline-sm text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Student Wanted Request
                      </span>
                      <span className="font-body-sm text-[11px] text-amber-800/80 mt-0.5 line-clamp-1">
                        Looking to acquire from peer
                      </span>
                    </div>
                  ) : images[0] ? (
                    <img
                      src={images[0].url}
                      alt="Preview Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/60 gap-1">
                      <span className="material-symbols-outlined text-4xl">photo_camera</span>
                      <span className="text-xs font-medium">Add photos to preview</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {listingType === 'wanted' ? (
                      <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-label-sm text-[11px] font-bold shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">campaign</span>
                        WANTED
                      </span>
                    ) : (
                      condition && (
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-sm text-secondary font-label-sm text-[11px] font-semibold shadow-sm">
                          {CONDITIONS.find((c) => c.value === condition)?.label || condition}
                        </span>
                      )
                    )}
                    <span className="px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-label-sm text-[11px] shadow-sm">
                      {campus?.split(' ')[0] || 'Campus'}
                    </span>
                  </div>

                  {/* Price / Budget Tag */}
                  <span className={cn(
                    'absolute bottom-2 right-2 px-2.5 py-1 rounded-lg font-headline-sm text-headline-sm font-bold shadow-md',
                    listingType === 'wanted'
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : 'bg-primary-container text-on-primary'
                  )}>
                    {listingType === 'free'
                      ? 'FREE'
                      : listingType === 'wanted'
                      ? budgetMax
                        ? `Budget: Rs. ${Number(budgetMax).toLocaleString('en-LK')}`
                        : 'Open to Offers'
                      : price
                      ? `Rs. ${Number(price).toLocaleString('en-LK')}`
                      : 'Rs. 0'}
                  </span>
                </div>

                <div className="p-space-sm flex flex-col gap-1.5 bg-surface-container-lowest">
                  {listingType === 'wanted' && (
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                        Looking for:
                      </span>
                      {urgency && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold',
                          urgency === 'urgent'
                            ? 'bg-red-100 text-red-700'
                            : urgency === 'this-week'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {urgency === 'urgent' ? '⚡ Urgent' : urgency === 'this-week' ? '📅 This Week' : '🌱 Flexible'}
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 leading-snug">
                    {title || 'Listing Title will appear here...'}
                  </h3>

                  <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-xs pt-1">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <span className="material-symbols-outlined text-xs text-secondary">location_on</span>
                      <span className="truncate">{selectedSpots[0] || 'Campus Meetup'}</span>
                    </span>
                    {priceMode === 'negotiable' && listingType !== 'free' && listingType !== 'wanted' && (
                      <span className="font-label-sm text-[11px] text-secondary font-semibold">
                        Negotiable
                      </span>
                    )}
                  </div>

                  {/* Seller footer */}
                  <div className="pt-2 mt-1 border-t border-outline-variant/20 flex items-center justify-between font-label-sm text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[10px] font-bold">
                        {user?.fullName?.charAt(0) || 'S'}
                      </div>
                      <span className="text-on-surface font-semibold truncate max-w-[100px]">
                        {user?.fullName?.split(' ')[0] || 'Student'}
                      </span>
                    </div>
                    <span className="text-secondary font-semibold">
                      @{user?.email ? user.email.split('@')[1] : 'cmb.ac.lk'} verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Publishing Box */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md border border-outline-variant/20 flex flex-col gap-space-sm">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-space-md rounded-lg bg-secondary text-on-secondary font-headline-md text-headline-md font-semibold hover:bg-secondary/90 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-space-xs shadow-md"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    <span>{isEditing ? 'Updating Listing...' : 'Uploading & Publishing...'}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">
                      {isEditing ? 'save' : 'bolt'}
                    </span>
                    <span>{isEditing ? 'Save Changes' : 'Publish Listing to Campus'}</span>
                  </>
                )}
              </button>

              <Link
                to="/my-listings"
                className="w-full py-2 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-colors text-center"
              >
                Cancel & Return
              </Link>

              <p className="font-body-sm text-[11px] text-on-surface-variant text-center pt-1">
                By publishing, you affirm adherence to the{' '}
                <span className="text-secondary font-semibold">UniMart Student Honor Code</span>.
              </p>
            </div>

            {/* Safety & Honor Code Accordion */}
            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm border border-outline-variant/20">
              <div className="flex items-center gap-space-xs text-on-surface">
                <span className="material-symbols-outlined text-secondary text-xl">policy</span>
                <span className="font-headline-sm text-headline-sm font-semibold">
                  Campus Marketplace Guidelines
                </span>
              </div>
              <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                  <span>Only verified @*.ac.lk students can chat and meet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                  <span>Meet inside library lobbies or faculty courtyards.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                  <span>Never send advance deposits before viewing in person.</span>
                </li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};
