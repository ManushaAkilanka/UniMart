import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security & utility middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', apiRoutes);

// Fallthrough handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
