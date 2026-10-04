/**
 * useNotifications
 *
 * Manages in-app notifications for the authenticated user.
 * - Loads paginated notifications via REST on mount
 * - Listens for `new_notification` socket events for instant push
 * - Exposes helpers to mark one or all as read
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../utils/api';

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 25 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time: new notification pushed from server
  useEffect(() => {
    if (!socket) return;

    const handler = (notification) => {
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((c) => c + 1);
    };

    socket.on('new_notification', handler);
    return () => socket.off('new_notification', handler);
  }, [socket]);

  const markOneRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markOneRead,
    markAllRead,
    refetch: fetchNotifications,
  };
};
