/**
 * Test DB helper using mongodb-memory-server for isolated, fast tests.
 * No real MongoDB installation required.
 *
 * NOTE: On first run, mongodb-memory-server downloads a MongoDB binary (~60 MB).
 * Subsequent runs use the cached binary and are much faster.
 * If the download times out, re-run `npm test --workspace=server` once the
 * binary is fully cached at: %USERPROFILE%\.cache\mongodb-binaries\
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod = null;

export async function setupTestDB() {
  // If already connected, reuse
  if (mongoose.connection.readyState === 1) return;

  // Allow up to 3 minutes for the binary to download on first run
  mongod = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 180_000,
    },
    binary: {
      downloadDir: undefined, // use default cache dir
    },
  });
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30_000,
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
