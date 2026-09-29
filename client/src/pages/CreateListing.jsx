import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListingForm } from '../components/listings/ListingForm';
import { createListing } from '../utils/api';

export const CreateListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await createListing(formData);
      const newListing = res.data?.listing;
      navigate(newListing?._id ? `/listings/${newListing._id}` : '/my-listings', {
        state: { message: 'Listing published successfully to campus!' },
      });
    } catch (err) {
      setError(err.message || 'Failed to create listing. Please check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ListingForm
      isEditing={false}
      onSubmit={handleCreate}
      loading={loading}
      error={error}
    />
  );
};
