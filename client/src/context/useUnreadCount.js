/**
 * useUnreadCount
 *
 * Returns the total unread message count across all conversations.
 *
 * Primary: listens for `unread_count_change` events from the Socket.IO server.
 * Fallback: polls GET /api/conversations every 30 s when the socket is not
 *           connected, so the badge never silently stales on reconnect lag.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getConversations } from '../utils/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const FALLBACK_POLL_INTERVAL_MS = 30_000;

export const useUnreadCount = () => {
  const { isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await getConversations();
      const total = (data.conversations || []).reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0
      );
      setUnreadCount(total);
    } catch {
      // silent — badge just stays at last known value
    }
  }, [isAuthenticated]);

  // Initial fetch on mount / auth change
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Socket listener: server pushes the new count so we never need to re-fetch
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handler = ({ count }) => {
      setUnreadCount(typeof count === 'number' ? count : 0);
    };
    socket.on('unread_count_change', handler);
    return () => socket.off('unread_count_change', handler);
  }, [socket, isAuthenticated]);

  // Fallback polling: only run when socket is disconnected / unavailable
  useEffect(() => {
    if (!isAuthenticated) return;

    if (!isConnected) {
      // Start fallback poll
      pollRef.current = setInterval(fetchCount, FALLBACK_POLL_INTERVAL_MS);
    } else {
      // Socket is up — clear the fallback poll
      clearInterval(pollRef.current);
    }

    return () => clearInterval(pollRef.current);
  }, [isConnected, isAuthenticated, fetchCount]);

  return unreadCount;
};
