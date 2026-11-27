import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { ensureDefaultCategories } from '../config/categoryCatalog.js';
import { Category } from '../models/index.js';
import { clearCollections, setupTestDB, teardownTestDB } from './helpers/testDB.js';

describe('Marketplace category catalog', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it('exposes medical and university-focused categories through the public API', async () => {
    await ensureDefaultCategories();

    const response = await request(app).get('/api/categories');
    const categories = response.body.data.categories;
    const bySlug = new Map(categories.map((category) => [category.slug, category]));

    expect(response.status).toBe(200);
    expect(categories).toHaveLength(10);
    expect(bySlug.get('medical-healthcare')).toMatchObject({
      name: 'Medical & Healthcare',
      icon: 'medical_services',
    });
    expect(bySlug.get('medical-healthcare').description).toMatch(/no medicines/i);
    expect(bySlug.has('lab-engineering-equipment')).toBe(true);
    expect(bySlug.has('arts-design-supplies')).toBe(true);
    expect(bySlug.has('music-audio-gear')).toBe(true);

    await ensureDefaultCategories();
    expect(await Category.countDocuments()).toBe(10);
  });
});
