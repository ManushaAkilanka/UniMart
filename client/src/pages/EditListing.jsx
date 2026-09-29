import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ListingForm } from '../components/listings/ListingForm';
import { getListingById, updateListing } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setInitialLoading(true);
    setFetchError(null);

    getListingById(id)
      .then((res) => {
        if (!cancelled) {
          const fetched = res.data?.listing;
          if (!fetched) {
            setFetchError('Listing not found.');
          } else {
            // Check ownership
            const sellerId = fetched.sellerId?._id || fetched.sellerId;
            if (user && sellerId && sellerId.toString() !== user._id?.toString() && user.role !== 'admin') {
              setFetchError('You do not have permission to edit this listing.');
            } else {
              setListing(fetched);
            }
          }
          setInitialLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err.message || 'Could not load listing details for editing.');
          setInitialLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const handleUpdate = async (formData) => {
    try {
      setSaving(true);
      setSaveError(null);
      await updateListing(id, formData);
      navigate(`/listings/${id}`, {
        state: { message: 'Listing updated successfully!' },
      });
    } catch (err) {
      setSaveError(err.message || 'Failed to update listing. Please verify inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-3xl flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-4xl text-secondary animate-spin">
          progress_activity
        </span>
        <p className="font-body-md text-body-md text-on-surface-variant">Loading listing details...</p>
      </div>
    );
  }

  if (fetchError || !listing) {
    return (
      <div className="w-full max-w-2xl mx-auto px-margin py-space-3xl text-center flex flex-col items-center gap-space-md">
        <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">error_outline</span>
        </div>
        <h2 className="font-headline-xl text-headline-xl text-on-surface">Unable to Edit Listing</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{fetchError}</p>
        <Link
          to="/my-listings"
          className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Return to My Listings</span>
        </Link>
      </div>
    );
  }

  return (
    <ListingForm
      initialData={listing}
      isEditing={true}
      onSubmit={handleUpdate}
      loading={saving}
      error={saveError}
    />
  );
};
