import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { isAllowedOrigin } from './config/cors.js';
import mongoSanitize from './middleware/mongoSanitize.js';
import { authLimiter, apiLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

const app = express();

app.set('trust proxy', 1);

// Security & utility middlewares: explicit CSP & HSTS via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'ws:', 'wss:', ENV.CLIENT_URL || 'http://localhost:5173'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching allowed origins
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        const corsErr = new Error('Origin not allowed by CORS policy');
        corsErr.statusCode = 403;
        corsErr.isCors = true;
        callback(corsErr);
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize({ replaceWith: '_' }));

// Enforce Content-Type for state-changing requests with body (CSRF defense)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    const contentLength = req.headers['content-length'];
    const hasBody = (contentLength && parseInt(contentLength, 10) > 0) || req.headers['transfer-encoding'];

    // Reject form-urlencoded and text/plain to prevent simple CSRF bypass
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('text/plain')) {
      return res.status(415).json({
        success: false,
        message: 'Unsupported Content-Type. Please use application/json or multipart/form-data.',
      });
    }

    if (hasBody && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json or multipart/form-data.',
      });
    }
  }
  next();
});

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static uploads directory (for avatars and listings when local storage fallback is used)
app.use('/uploads', express.static(UPLOADS_DIR));

// Rate limiters before routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api', apiLimiter);

// API Routes
app.use('/api', apiRoutes);

// Fallthrough handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
