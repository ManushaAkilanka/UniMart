import dns from 'dns';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { ENV } from '../config/env.js';
import { ensureDefaultCategories } from '../config/categoryCatalog.js';

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Use the system DNS resolver when custom DNS configuration is unavailable.
    }

    await mongoose.connect(ENV.MONGO_URI);
    await ensureDefaultCategories();
    console.log('Default marketplace categories are available.');
  } catch {
    console.error('Could not ensure default categories in the configured database.');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
