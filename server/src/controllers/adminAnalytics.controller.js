import { z } from 'zod';
import { Category, Conversation, Favorite, Listing, User } from '../models/index.js';

const querySchema = z
  .object({
    range: z.enum(['7d', '30d', '90d', 'all']).optional(),
    limit: z.coerce.number().int().min(1).max(25).optional(),
    campus: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

function getRangeStart(range) {
  const days =
    range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : undefined;
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
}

function listingMatch(filters, dateField = 'createdAt') {
  const match = {};
  if (filters.start) {
    if (dateField === 'updatedAt') match.updatedAt = { $gte: filters.start };
    else match.createdAt = { $gte: filters.start };
  }
  if (filters.campus) match.campus = filters.campus;
  if (filters.category) {
    match.categoryId = filters.categoryId || { $in: [] };
  }
  return match;
}

async function getFilters(req, res) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid analytics query parameters.' });
    return null;
  }

  const params = parsed.data;
  const range = params.range || '30d';
  const category = params.category
    ? await Category.findOne({
        $or: [{ slug: params.category.toLowerCase() }, { name: params.category }],
      })
        .select('_id')
        .lean()
    : null;

  return {
    range,
    start: getRangeStart(range),
    limit: params.limit || 10,
    campus: params.campus,
    category: params.category,
    categoryId: category?._id,
  };
}

function withAnalyticsFilters(handler) {
  return async (req, res, next) => {
    try {
      const filters = await getFilters(req, res);
      if (filters) await handler(req, res, filters);
    } catch (error) {
      next(error);
    }
  };
}

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

function publicSeller(seller) {
  if (!seller) return { id: null, name: 'Unknown seller', faculty: null, campus: null, email: null };
  return {
    id: String(seller._id),
    name: seller.fullName,
    faculty: seller.faculty || null,
    campus: seller.campus || null,
    email: maskEmail(seller.email),
  };
}

function sellerLookup() {
  return [
    {
      $lookup: {
        from: User.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'seller',
      },
    },
    { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        created: 1,
        active: 1,
        sold: 1,
        estimatedValueSold: 1,
        views: 1,
        listingIds: 1,
        seller: {
          _id: '$seller._id',
          fullName: '$seller.fullName',
          faculty: '$seller.faculty',
          campus: '$seller.campus',
          email: '$seller.email',
        },
      },
    },
  ];
}

function conversationFilterPipeline(filters) {
  const pipeline = [];
  if (filters.start) pipeline.push({ $match: { createdAt: { $gte: filters.start } } });
  pipeline.push(
    {
      $lookup: {
        from: Listing.collection.name,
        localField: 'listingId',
        foreignField: '_id',
        as: 'listing',
      },
    },
    { $unwind: '$listing' }
  );
  const listingFilters = listingMatch({ ...filters, start: null });
  if (Object.keys(listingFilters).length) {
    pipeline.push({
      $match: Object.fromEntries(
        Object.entries(listingFilters).map(([key, value]) => [`listing.${key}`, value])
      ),
    });
  }
  return pipeline;
}

async function getSellerListingTotals(filters) {
  return Listing.aggregate([
    { $match: listingMatch(filters) },
    {
      $group: {
        _id: '$sellerId',
        created: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        sold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
        estimatedValueSold: {
          $sum: { $cond: [{ $eq: ['$status', 'sold'] }, '$price', 0] },
        },
        views: { $sum: '$viewCount' },
        listingIds: { $push: '$_id' },
      },
    },
    ...sellerLookup(),
  ]);
}

async function getSellerEngagement(filters) {
  const favoriteMatch = { $expr: { $in: ['$listingId', '$$listingIds'] } };
  if (filters.start) favoriteMatch.createdAt = { $gte: filters.start };

  const [listingEngagement, conversationEngagement] = await Promise.all([
    Listing.aggregate([
      { $match: listingMatch(filters) },
      { $group: { _id: '$sellerId', views: { $sum: '$viewCount' }, listingIds: { $push: '$_id' } } },
      {
        $lookup: {
          from: Favorite.collection.name,
          let: { listingIds: '$listingIds' },
          pipeline: [{ $match: favoriteMatch }, { $count: 'count' }],
          as: 'favoriteCounts',
        },
      },
      {
        $project: {
          _id: 1,
          views: 1,
          favoritesReceived: { $ifNull: [{ $arrayElemAt: ['$favoriteCounts.count', 0] }, 0] },
        },
      },
    ]),
    Conversation.aggregate([
      ...conversationFilterPipeline(filters),
      { $group: { _id: '$sellerId', conversationsReceived: { $sum: 1 } } },
    ]),
  ]);

  const engagementBySeller = new Map(
    listingEngagement.map((item) => [String(item._id), { ...item, conversationsReceived: 0 }])
  );
  for (const item of conversationEngagement) {
    const key = String(item._id);
    const current = engagementBySeller.get(key) || {
      _id: item._id,
      views: 0,
      favoritesReceived: 0,
    };
    current.conversationsReceived = item.conversationsReceived;
    engagementBySeller.set(key, current);
  }
  return engagementBySeller;
}

function sellerMetrics(row, engagement) {
  const sellerEngagement = engagement.get(String(row._id)) || {
    views: 0,
    favoritesReceived: 0,
    conversationsReceived: 0,
  };
  const sellThroughRate = row.created ? row.sold / row.created : 0;
  const bestSellerScore =
    row.sold * 10 +
    sellThroughRate * 25 +
    sellerEngagement.views / 100 +
    sellerEngagement.favoritesReceived * 5 +
    sellerEngagement.conversationsReceived * 10;

  return {
    seller: publicSeller(row.seller),
    created: row.created,
    active: row.active,
    sold: row.sold,
    estimatedValueSold: row.estimatedValueSold,
    sellThroughRate,
    views: sellerEngagement.views,
    favoritesReceived: sellerEngagement.favoritesReceived,
    conversationsReceived: sellerEngagement.conversationsReceived,
    bestSellerScore: Number(bestSellerScore.toFixed(2)),
  };
}

export const getOverview = withAnalyticsFilters(async (req, res, filters) => {
  const userMatch = filters.campus ? { campus: filters.campus } : {};
  const listingPipeline = [
    { $match: listingMatch(filters) },
    {
      $group: {
        _id: null,
        activeListings: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        soldListings: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
        estimatedValueSold: {
          $sum: { $cond: [{ $eq: ['$status', 'sold'] }, '$price', 0] },
        },
        freeItemsClaimed: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'claimed'] }, { $eq: ['$listingType', 'free'] }] },
              1,
              0,
            ],
          },
        },
        wantedRequestsFulfilled: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'fulfilled'] }, { $eq: ['$listingType', 'wanted'] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];
  const [userCounts, listingCounts, conversationCount] = await Promise.all([
    User.aggregate([
      { $match: userMatch },
      {
        $facet: {
          total: [{ $count: 'count' }],
          newInRange: [
            ...(filters.start ? [{ $match: { createdAt: { $gte: filters.start } } }] : []),
            { $count: 'count' },
          ],
          pending: [{ $match: { accountStatus: 'pending_approval' } }, { $count: 'count' }],
        },
      },
    ]),
    Listing.aggregate(listingPipeline),
    Conversation.aggregate([
      ...conversationFilterPipeline(filters),
      { $count: 'count' },
    ]),
  ]);

  const userStats = userCounts[0] || {};
  const listings = listingCounts[0] || {};
  res.json({
    success: true,
    range: filters.range,
    overview: {
      totalUsers: userStats.total?.[0]?.count || 0,
      newUsersInRange: userStats.newInRange?.[0]?.count || 0,
      activeListings: listings.activeListings || 0,
      soldListings: listings.soldListings || 0,
      estimatedValueSold: listings.estimatedValueSold || 0,
      freeItemsClaimed: listings.freeItemsClaimed || 0,
      wantedRequestsFulfilled: listings.wantedRequestsFulfilled || 0,
      conversationsStarted: conversationCount[0]?.count || 0,
      pendingAccounts: userStats.pending?.[0]?.count || 0,
    },
  });
});

export const getTopListers = withAnalyticsFilters(async (req, res, filters) => {
  const sellers = await Listing.aggregate([
    { $match: listingMatch(filters) },
    {
      $group: {
        _id: '$sellerId',
        created: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        sold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
      },
    },
    { $sort: { created: -1, sold: -1, _id: 1 } },
    { $limit: filters.limit },
    ...sellerLookup(),
  ]);

  res.json({
    success: true,
    range: filters.range,
    sellers: sellers.map((seller) => ({
      seller: publicSeller(seller.seller),
      created: seller.created,
      active: seller.active,
      sold: seller.sold,
    })),
  });
});

export const getTopSellers = withAnalyticsFilters(async (req, res, filters) => {
  const [totals, engagement] = await Promise.all([
    getSellerListingTotals(filters),
    getSellerEngagement(filters),
  ]);
  const sellers = totals.map((row) => sellerMetrics(row, engagement));
  const bySales = [...sellers]
    .filter((seller) => seller.sold > 0)
    .sort(
      (a, b) =>
        b.sold - a.sold ||
        b.estimatedValueSold - a.estimatedValueSold ||
        a.seller.name.localeCompare(b.seller.name)
    )
    .slice(0, filters.limit);
  const bestSellers = [...sellers]
    .filter((seller) => seller.bestSellerScore > 0)
    .sort((a, b) => b.bestSellerScore - a.bestSellerScore || b.sold - a.sold)
    .slice(0, filters.limit);

  res.json({
    success: true,
    range: filters.range,
    bestSellerFormula:
      'sold × 10 + (sold / created) × 25 + views / 100 + favorites received × 5 + conversations received × 10',
    sellers: bySales,
    bestSellers,
  });
});

export const getEngagement = withAnalyticsFilters(async (req, res, filters) => {
  const [totals, engagement] = await Promise.all([
    getSellerListingTotals(filters),
    getSellerEngagement(filters),
  ]);
  const sellers = totals
    .map((row) => sellerMetrics(row, engagement))
    .sort(
      (a, b) =>
        b.views + b.favoritesReceived + b.conversationsReceived -
        (a.views + a.favoritesReceived + a.conversationsReceived)
    )
    .slice(0, filters.limit)
    .map(({ seller, views, favoritesReceived, conversationsReceived }) => ({
      seller,
      views,
      favoritesReceived,
      conversationsReceived,
    }));

  res.json({ success: true, range: filters.range, sellers });
});

export const getCategories = withAnalyticsFilters(async (req, res, filters) => {
  const categories = await Listing.aggregate([
    { $match: listingMatch(filters) },
    {
      $group: {
        _id: '$categoryId',
        listings: { $sum: 1 },
        sold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
        averagePrice: {
          $avg: { $cond: [{ $eq: ['$listingType', 'sale'] }, '$price', null] },
        },
        types: { $push: '$listingType' },
      },
    },
    {
      $lookup: {
        from: Category.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $sort: { listings: -1, _id: 1 } },
    { $limit: filters.limit },
    {
      $project: {
        name: { $ifNull: ['$category.name', 'Uncategorized'] },
        listings: 1,
        sold: 1,
        averagePrice: { $ifNull: ['$averagePrice', 0] },
        types: 1,
      },
    },
  ]);

  res.json({
    success: true,
    range: filters.range,
    categories: categories.map((item) => {
      const typeCounts = new Map();
      for (const type of item.types) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
      return {
        name: item.name,
        listings: item.listings,
        sold: item.sold,
        averagePrice: Math.round(item.averagePrice),
        listingTypeMix: Object.fromEntries(typeCounts),
      };
    }),
  });
});

export const getCampusesAndFaculties = withAnalyticsFilters(async (req, res, filters) => {
  const userMatch = filters.campus ? { campus: filters.campus } : {};
  const listingFilters = listingMatch(filters);
  const [campusUsers, facultyUsers, campusListings, facultyListings] = await Promise.all([
    User.aggregate([
      { $match: userMatch },
      { $group: { _id: { $ifNull: ['$campus', 'Unspecified'] }, users: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: userMatch },
      { $group: { _id: { $ifNull: ['$faculty', 'Unspecified'] }, users: { $sum: 1 } } },
    ]),
    Listing.aggregate([
      { $match: listingFilters },
      { $group: { _id: { $ifNull: ['$campus', 'Unspecified'] }, listings: { $sum: 1 } } },
    ]),
    Listing.aggregate([
      { $match: listingFilters },
      {
        $lookup: {
          from: User.collection.name,
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller',
        },
      },
      { $unwind: '$seller' },
      {
        $group: {
          _id: { $ifNull: ['$seller.faculty', 'Unspecified'] },
          listings: { $sum: 1 },
        },
      },
    ]),
  ]);

  const combine = (users, listings) => {
    const listingCounts = new Map(listings.map((item) => [item._id, item.listings]));
    return users
      .map((item) => ({
        name: item._id,
        users: item.users,
        listings: listingCounts.get(item._id) || 0,
      }))
      .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name))
      .slice(0, filters.limit);
  };
  const campusListingCounts = new Map(campusListings.map((item) => [item._id, item.listings]));

  res.json({
    success: true,
    range: filters.range,
    campuses: campusUsers
      .map((item) => ({
        name: item._id,
        users: item.users,
        listings: campusListingCounts.get(item._id) || 0,
      }))
      .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name))
      .slice(0, filters.limit),
    faculties: combine(facultyUsers, facultyListings),
  });
});

export const getTrends = withAnalyticsFilters(async (req, res, filters) => {
  const unit = filters.range === '7d' || filters.range === '30d' ? 'day' : 'week';
  const trendPipeline = (status, dateField) => [
    { $match: { ...listingMatch(filters, dateField), ...(status ? { status } : {}) } },
    {
      $group: {
        _id: { $dateTrunc: { date: `$${dateField}`, unit, timezone: 'UTC' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const [created, sold] = await Promise.all([
    Listing.aggregate(trendPipeline(null, 'createdAt')),
    Listing.aggregate(trendPipeline('sold', 'updatedAt')),
  ]);
  const points = new Map();
  for (const item of created) {
    const key = item._id.toISOString();
    points.set(key, { date: key, created: item.count, sold: 0 });
  }
  for (const item of sold) {
    const key = item._id.toISOString();
    const point = points.get(key) || { date: key, created: 0, sold: 0 };
    point.sold = item.count;
    points.set(key, point);
  }

  res.json({
    success: true,
    range: filters.range,
    soldDateNote: 'Sold counts use listing updatedAt as a proxy; the app does not store a separate sold timestamp.',
    trends: [...points.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-filters.limit),
  });
});
