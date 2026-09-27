import { ENV } from '../config/env.js';

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`[Server Error] ${req.method} ${req.originalUrl} -`, err.message);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
