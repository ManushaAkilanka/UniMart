import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongodInstance = null;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    if (ENV.NODE_ENV !== 'production') {
      try {
        console.warn(`[MongoDB] Local MongoDB unreachable (${error.message}). Starting in-memory MongoDB...`);
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!mongodInstance) {
          mongodInstance = await MongoMemoryServer.create();
        }
        const memUri = mongodInstance.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[MongoDB] In-memory MongoDB connected successfully at ${memUri}`);
        return conn;
      } catch (memErr) {
        console.error('[MongoDB] Failed to start in-memory database:', memErr.message);
      }
    }
    console.warn(`[MongoDB] Connection notice: ${error.message}`);
    console.warn('[MongoDB] Running without persistent DB or pending Atlas connection configuration.');
    return null;
  }
};
