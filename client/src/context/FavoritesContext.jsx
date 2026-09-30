/**
 * useFavorites — global favorites state hook
 *
 * Loads the set of favorited listing IDs on mount (when authenticated).
 * Exposes toggle(), isFavorited(), and the live count for the navbar badge.
 *
 * Usage:
 *   const { isFavorited, toggle, count, loading } = useFavorites();
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getFavoriteIds, addFavorite, removeFavorite } from '../utils/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [ids, setIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  // Track in-flight toggles per listing to prevent double-click races
  const pending = useRef(new Set());

  const loadIds = useCallback(async () => {
    if (!isAuthenticated) {
      setIds(new Set());
      return;
    }
    try {
      setLoading(true);
      const res = await getFavoriteIds();
      setIds(new Set(res.data?.ids ?? []));
    } catch {
      // Network error — keep existing state
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load on mount / auth change
  useEffect(() => {
    if (!authLoading) {
      loadIds();
    }
  }, [authLoading, loadIds]);

  /**
   * Toggle heart for a listing.
   * Optimistic UI: update local state immediately, then sync with server.
   * @param {string} listingId
   * @returns {{ saved: boolean } | null}  null if not authenticated
   */
  const toggle = useCallback(
    async (listingId) => {
      if (!isAuthenticated) return null;
      if (pending.current.has(listingId)) return null; // debounce

      pending.current.add(listingId);
      const wasSaved = ids.has(listingId);

      // Optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.delete(listingId) : next.add(listingId);
        return next;
      });

      try {
        if (wasSaved) {
          await removeFavorite(listingId);
        } else {
          await addFavorite(listingId);
        }
        return { saved: !wasSaved };
      } catch (err) {
        // Rollback on error
        setIds((prev) => {
          const next = new Set(prev);
          wasSaved ? next.add(listingId) : next.delete(listingId);
          return next;
        });
        throw err;
      } finally {
        pending.current.delete(listingId);
      }
    },
    [isAuthenticated, ids]
  );

  const isFavorited = useCallback((listingId) => ids.has(listingId), [ids]);

  return (
    <FavoritesContext.Provider
      value={{ ids, count: ids.size, loading, isFavorited, toggle, refresh: loadIds }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
