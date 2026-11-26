import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getAdminAnalyticsOverview,
  getAdminAnalyticsTopListers,
  getAdminAnalyticsTopSellers,
  getAdminAnalyticsEngagement,
  getAdminAnalyticsCategories,
  getAdminAnalyticsCampusesFaculties,
  getAdminAnalyticsTrends,
} from '../../utils/api';

const money = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
});
const tooltipStyle = {
  backgroundColor: 'rgb(var(--color-surface-container-lowest))',
  border: '1px solid rgb(var(--color-outline-variant))',
  borderRadius: '0.5rem',
  color: 'rgb(var(--color-on-surface))',
};

function Stat({ label, value, note, loading }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <p className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-surface-container-high" />
      ) : (
        <p className="mt-1 font-display-hero text-2xl font-bold text-on-surface">{value ?? 0}</p>
      )}
      {note && <p className="mt-1 text-xs text-on-surface-variant">{note}</p>}
    </div>
  );
}

function EmptyState({ children = 'No data for this range.' }) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant/50 px-4 py-8 text-center text-sm text-on-surface-variant">
      {children}
    </div>
  );
}

function Person({ seller }) {
  return (
    <div className="min-w-40">
      <div className="font-medium text-on-surface">{seller?.name || 'Unknown seller'}</div>
      <div className="text-xs text-on-surface-variant">
        {[seller?.faculty, seller?.campus].filter(Boolean).join(' · ') || 'No faculty or campus'}
      </div>
      {seller?.email && <div className="text-xs text-on-surface-variant">{seller.email}</div>}
    </div>
  );
}

function DataTable({ title, rows, columns, loading, info }) {
  return (
    <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="mb-space-sm flex items-center gap-2">
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        {info && (
          <span
            className="material-symbols-outlined cursor-help text-base text-on-surface-variant"
            title={info}
            aria-label={info}
            role="img"
          >
            info
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-3" aria-label={`Loading ${title}`}>
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-8 animate-pulse rounded bg-surface-container" />
          ))}
        </div>
      ) : !rows?.length ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/30 text-xs uppercase text-on-surface-variant">
                {columns.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-2 py-2 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.seller?.id || row.name || index} className="border-b border-outline-variant/15 last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-2 py-3 text-on-surface">
                      {column.render ? column.render(row, index) : row[column.key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ChartPanel({ title, children, empty, loading }) {
  return (
    <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <h2 className="mb-space-sm font-headline-md text-headline-md text-on-surface">{title}</h2>
      {loading ? (
        <div className="h-64 animate-pulse rounded-lg bg-surface-container" />
      ) : empty ? (
        <EmptyState />
      ) : (
        <div className="h-64 text-on-surface-variant">{children}</div>
      )}
    </section>
  );
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState('30d');
  const [campus, setCampus] = useState('');
  const [category, setCategory] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const params = { range, limit: 10, campus: campus.trim(), category: category.trim() };
    setLoading(true);
    setError('');

    Promise.all([
      getAdminAnalyticsOverview(params),
      getAdminAnalyticsTopListers(params),
      getAdminAnalyticsTopSellers(params),
      getAdminAnalyticsEngagement(params),
      getAdminAnalyticsCategories(params),
      getAdminAnalyticsCampusesFaculties(params),
      getAdminAnalyticsTrends(params),
    ])
      .then(([overview, topListers, topSellers, engagement, categories, locations, trends]) => {
        if (active) {
          setAnalytics({ overview, topListers, topSellers, engagement, categories, locations, trends });
        }
      })
      .catch(() => {
        if (active) setError('Analytics could not be loaded. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, campus, category]);

  const metrics = analytics?.overview?.overview || {};
  const topSellers = analytics?.topSellers?.sellers || [];
  const bestSellers = analytics?.topSellers?.bestSellers || [];
  const formula =
    'Best-seller score = sold × 10 + (sold / created) × 25 + views / 100 + favorites received × 5 + conversations received × 10';
  const trends = analytics?.trends?.trends || [];
  const categories = analytics?.categories?.categories || [];
  const percentage = (value) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-space-md">
      <div className="flex flex-wrap items-end gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
          Range
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-on-surface"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
          Campus
          <input
            value={campus}
            onChange={(event) => setCampus(event.target.value)}
            placeholder="All campuses"
            className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
          Category
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="All categories"
            className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-on-surface"
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-error-container/40 p-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total users" value={metrics.totalUsers} loading={loading} />
        <Stat label="New users" value={metrics.newUsersInRange} note={`Selected range: ${range}`} loading={loading} />
        <Stat label="Active listings" value={metrics.activeListings} loading={loading} />
        <Stat label="Sold listings" value={metrics.soldListings} loading={loading} />
        <Stat label="Free items claimed" value={metrics.freeItemsClaimed} loading={loading} />
        <Stat label="Wanted requests fulfilled" value={metrics.wantedRequestsFulfilled} loading={loading} />
        <Stat label="Conversations started" value={metrics.conversationsStarted} loading={loading} />
        <Stat label="Pending accounts" value={metrics.pendingAccounts} loading={loading} />
      </div>

      <div className="rounded-xl border border-secondary/20 bg-secondary-container/30 p-space-md">
        <p className="font-headline-sm text-on-surface">Estimated value sold: {money.format(metrics.estimatedValueSold || 0)}</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Estimate only: sum of listed prices for listings marked sold. Self-reported and not verified; UniMart does not process payments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
        <ChartPanel title="Listings created and sold" loading={loading} empty={!trends.length}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid stroke="currentColor" opacity={0.12} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} tick={{ fill: 'currentColor', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line type="monotone" dataKey="created" name="Created" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sold" name="Sold (updatedAt proxy)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Listings by category" loading={loading} empty={!categories.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid stroke="currentColor" opacity={0.12} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="listings" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sold" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
      <p className="text-xs text-on-surface-variant">
        Sold trend dates use listing <code>updatedAt</code> as a proxy because no separate sold timestamp is stored.
      </p>

      <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
        <DataTable
          title="Top listers"
          rows={analytics?.topListers?.sellers}
          loading={loading}
          columns={[
            { key: 'rank', label: '#', render: (_row, index) => index + 1 },
            { key: 'seller', label: 'Seller', render: (row) => <Person seller={row.seller} /> },
            { key: 'created', label: 'Created' },
            { key: 'active', label: 'Active' },
            { key: 'sold', label: 'Sold' },
          ]}
        />
        <DataTable
          title="Top sellers"
          rows={topSellers}
          loading={loading}
          columns={[
            { key: 'rank', label: '#', render: (_row, index) => index + 1 },
            { key: 'seller', label: 'Seller', render: (row) => <Person seller={row.seller} /> },
            { key: 'sold', label: 'Items sold' },
            { key: 'estimatedValueSold', label: 'Estimated value', render: (row) => money.format(row.estimatedValueSold) },
            { key: 'sellThroughRate', label: 'Sell-through', render: (row) => percentage(row.sellThroughRate) },
          ]}
        />
        <DataTable
          title="Best-seller score"
          rows={bestSellers}
          loading={loading}
          info={formula}
          columns={[
            { key: 'rank', label: '#', render: (_row, index) => index + 1 },
            { key: 'seller', label: 'Seller', render: (row) => <Person seller={row.seller} /> },
            { key: 'bestSellerScore', label: 'Score' },
            { key: 'sold', label: 'Sold' },
          ]}
        />
        <DataTable
          title="Seller engagement"
          rows={analytics?.engagement?.sellers}
          loading={loading}
          info="Views are cumulative for listings in the selected range. Favorites and conversations are filtered by range."
          columns={[
            { key: 'seller', label: 'Seller', render: (row) => <Person seller={row.seller} /> },
            { key: 'views', label: 'Views' },
            { key: 'favoritesReceived', label: 'Favorites' },
            { key: 'conversationsReceived', label: 'Conversations' },
          ]}
        />
        <DataTable
          title="Category performance"
          rows={categories}
          loading={loading}
          columns={[
            { key: 'name', label: 'Category' },
            { key: 'listings', label: 'Listings' },
            { key: 'sold', label: 'Sold' },
            { key: 'averagePrice', label: 'Average sale price', render: (row) => money.format(row.averagePrice) },
            { key: 'listingTypeMix', label: 'Type mix', render: (row) => Object.entries(row.listingTypeMix).map(([type, count]) => `${type}: ${count}`).join(', ') },
          ]}
        />
        <DataTable
          title="Campuses"
          rows={analytics?.locations?.campuses}
          loading={loading}
          columns={[
            { key: 'name', label: 'Campus' },
            { key: 'users', label: 'Users' },
            { key: 'listings', label: 'Listings' },
          ]}
        />
        <DataTable
          title="Faculties"
          rows={analytics?.locations?.faculties}
          loading={loading}
          columns={[
            { key: 'name', label: 'Faculty' },
            { key: 'users', label: 'Users' },
            { key: 'listings', label: 'Listings' },
          ]}
        />
      </div>
    </div>
  );
}
