import mongoose from 'mongoose';
import { ENV } from '../config/env.js';

export const getHealthStatus = () => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    status: 'ok',
    service: 'unimart-api',
    campus: 'University of Colombo',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: ENV.NODE_ENV,
    database: dbStatusMap[dbState] || 'unknown',
  };
};
