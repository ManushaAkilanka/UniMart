/**
 * SocketContext
 *
 * Manages a single Socket.IO connection for the authenticated user.
 * - Connects when the user is authenticated
 * - Disconnects and cleans up on logout / auth loss
 * - Exposes: socket, isConnected, socketStatus
 *
 * The socket is authenticated server-side via the HTTP-only cookie that is
 * automatically included in the upgrade handshake (same origin, credentials).
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [socketStatus, setSocketStatus] = useState('disconnected');

  useEffect(() => {
    // Only connect when authenticated
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setSocketStatus('disconnected');
      return;
    }

    // Already have a connected socket — skip reconnect
    if (socketRef.current?.connected) return;

    setSocketStatus('connecting');

    const socket = io(SOCKET_URL, {
      // withCredentials makes the browser send the HTTP-only cookie on the upgrade request
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      // 'io server disconnect' means server kicked us; don't auto-reconnect
      if (reason === 'io server disconnect') {
        socket.connect();
      }
      setSocketStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
      setSocketStatus('error');
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setSocketStatus('connected');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setSocketStatus('disconnected');
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, socketStatus }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};
