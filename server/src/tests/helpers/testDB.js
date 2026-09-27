/**
 * Test DB helper using mongodb-memory-server for isolated, fast tests.
 * No real MongoDB installation required.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod = null;

export async function setupTestDB() {
  // If already connected, reuse
  if (mongoose.connection.readyState === 1) return;

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
}

export async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
