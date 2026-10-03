import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// ── GET /api/listings (Query filters whitelist) ──────────────────────────────
export const getListingsQuerySchema = z.object({
  query: z
    .object({
      search: z
        .string()
        .trim()
        .max(100, 'Search query cannot exceed 100 characters')
        .optional(),
      category: z
        .string()
        .trim()
        .max(100, 'Category identifier cannot exceed 100 characters')
        .optional(),
      listingType: z
        .enum(['sale', 'free', 'rent', 'exchange', 'wanted'], {
          errorMap: () => ({ message: 'Invalid listing type' }),
        })
        .optional(),
      minPrice: z.coerce
        .number({ invalid_type_error: 'minPrice must be a valid number' })
        .min(0, 'minPrice cannot be negative')
        .max(10000000, 'minPrice exceeds maximum allowable limit')
        .optional(),
      maxPrice: z.coerce
        .number({ invalid_type_error: 'maxPrice must be a valid number' })
        .min(0, 'maxPrice cannot be negative')
        .max(10000000, 'maxPrice exceeds maximum allowable limit')
        .optional(),
      condition: z
        .enum(['new', 'like-new', 'used-good', 'used-fair'], {
          errorMap: () => ({ message: 'Invalid condition filter' }),
        })
        .optional(),
      campus: z
        .string()
        .trim()
        .max(100, 'Campus name cannot exceed 100 characters')
        .optional(),
      sort: z
        .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular'], {
          errorMap: () => ({ message: 'Invalid sort parameter' }),
        })
        .default('newest'),
      page: z.coerce
        .number({ invalid_type_error: 'page must be an integer' })
        .int('page must be an integer')
        .min(1, 'page must be at least 1')
        .default(1),
      limit: z.coerce
        .number({ invalid_type_error: 'limit must be an integer' })
        .int('limit must be an integer')
        .min(1, 'limit must be at least 1')
        .max(50, 'limit cannot exceed 50 items per page')
        .default(12),
    })
    .strict('Unrecognized query parameters are not allowed'),
});

// ── POST /api/listings (Create listing) ───────────────────────────────────────
export const createListingSchema = z.object({
  body: z
    .object({
      title: z
        .string({ required_error: 'Title is required' })
        .trim()
        .min(3, 'Title must be at least 3 characters')
        .max(120, 'Title must not exceed 120 characters'),
      description: z
        .string({ required_error: 'Description is required' })
        .trim()
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description must not exceed 2000 characters'),
      categoryId: z
        .string({ required_error: 'Category is required' })
        .trim()
        .min(1, 'Category is required'),
      listingType: z
        .enum(['sale', 'free', 'rent', 'exchange', 'wanted'], {
          errorMap: (issue, ctx) =>
            issue.code === 'invalid_enum_value'
              ? { message: 'Invalid listing type. Must be one of: sale, free, rent, exchange, wanted' }
              : { message: ctx.defaultError },
        })
        .refine((val) => val !== undefined, { message: 'Listing type is required' }),
      price: z.coerce
        .number({ invalid_type_error: 'Price must be a number' })
        .min(0, 'Price cannot be negative')
        .default(0),
      priceMode: z.enum(['fixed', 'negotiable']).default('fixed'),
      currency: z.literal('LKR').default('LKR'),
      budgetMin: z.coerce.number().min(0).optional(),
      budgetMax: z.coerce.number().min(0).optional(),
      urgency: z.enum(['urgent', 'this-week', 'flexible']).optional().default('flexible'),
      condition: z
        .enum(['new', 'like-new', 'used-good', 'used-fair'], {
          errorMap: () => ({ message: 'Invalid condition' }),
        })
        .optional(),
      campus: z
        .string({ required_error: 'Campus is required' })
        .trim()
        .min(2, 'Campus must be at least 2 characters')
        .max(120, 'Campus must not exceed 120 characters'),
      meetupSpots: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [val];
          } catch {
            return val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }),
      images: z
        .union([
          z.array(
            z.object({
              url: z.string().url('Invalid image URL'),
              publicId: z.string().min(1, 'publicId is required'),
            })
          ),
          z.string().transform((val) => {
            try {
              const parsed = JSON.parse(val);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }),
        ])
        .optional()
        .default([]),
      status: z.enum(['active', 'pending', 'hidden']).optional(),
    })
    .refine(
      (data) => {
        if (data.listingType !== 'free' && data.listingType !== 'wanted') {
          return data.price !== undefined && data.price > 0;
        }
        return true;
      },
      {
        message: 'Price is required for non-free listings',
        path: ['price'],
      }
    )
    .refine(
      (data) => {
        if (data.listingType !== 'wanted' && data.listingType !== 'free') {
          return Boolean(data.condition);
        }
        return true;
      },
      {
        message: 'Condition is required for items being listed',
        path: ['condition'],
      }
    ),
});

// ── GET /api/listings/:id ─────────────────────────────────────────────────────
export const getListingByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid listing ID format'),
  }),
});

// ── PATCH /api/listings/:id ───────────────────────────────────────────────────
export const updateListingSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid listing ID format'),
  }),
  body: z.object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    categoryId: z.string().trim().optional(),
    listingType: z.enum(['sale', 'free', 'rent', 'exchange', 'wanted']).optional(),
    price: z.coerce.number().min(0).optional(),
    priceMode: z.enum(['fixed', 'negotiable']).optional(),
    budgetMin: z.coerce.number().min(0).optional(),
    budgetMax: z.coerce.number().min(0).optional(),
    urgency: z.enum(['urgent', 'this-week', 'flexible']).optional(),
    condition: z.enum(['new', 'like-new', 'used-good', 'used-fair']).optional(),
    campus: z.string().trim().min(2).max(120).optional(),
    meetupSpots: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (Array.isArray(val)) return val;
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [val];
        } catch {
          return val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }),
    images: z
      .union([
        z.array(
          z.object({
            url: z.string().url(),
            publicId: z.string(),
          })
        ),
        z.string().transform((val) => {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }),
      ])
      .optional(),
  }),
});

// ── PATCH /api/listings/:id/status ────────────────────────────────────────────
export const updateListingStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECT_ID_REGEX, 'Invalid listing ID format'),
  }),
  body: z.object({
    status: z
      .enum(['active', 'sold', 'fulfilled', 'claimed', 'hidden', 'pending'], {
        errorMap: (issue, ctx) =>
          issue.code === 'invalid_enum_value'
            ? { message: 'Status must be active, sold, fulfilled, claimed, hidden, or pending' }
            : { message: ctx.defaultError },
      })
      .refine((val) => val !== undefined, { message: 'Status is required' }),
  }),
});
