import dns from 'dns';
import mongoose from 'mongoose';
import { ENV } from './env.js';
import { Category } from '../models/index.js';
import { seedData } from '../scripts/seed.js';

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
// (Prevents querySrv ECONNREFUSED on local routers/ISPs that do not resolve SRV records)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Graceful fallback if custom DNS setting is not permitted in the runtime
}

let mongodInstance = null;

const ensureSeedData = async () => {
  try {
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('[MongoDB] Empty database detected. Auto-seeding initial data...');
      await seedData();
    }
  } catch (seedErr) {
    console.warn('[MongoDB] Auto-seed warning:', seedErr.message);
  }
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    await ensureSeedData();
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
        await ensureSeedData();
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
