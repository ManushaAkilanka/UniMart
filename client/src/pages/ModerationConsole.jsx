import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import {
  getAdminStats,
  getAdminReports,
  getAdminReportById,
  updateReport,
  getAdminUsers,
  getAdminUserById,
  adminSuspendUser,
  adminUnsuspendUser,
  changeUserRole,
  getAdminListings,
  adminHideListing,
  adminApproveListing,
  getVerificationQueue,
  approveVerification,
  getAuditLog,
} from '../utils/api';
import { Modal } from '../components/ui/Modal';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-secondary-container text-on-secondary-container border-secondary/20',
  dismissed: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
};

const REASON_LABELS = {
  spam: 'Spam',
  inappropriate_content: 'Inappropriate Content',
  misleading_information: 'Misleading Info',
  prohibited_item: 'Prohibited Item',
  fraud: 'Fraud',
  harassment: 'Harassment',
  other: 'Other',
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'text-secondary', loading }) => (
  <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-space-md">
    <div className={cn('p-2.5 rounded-lg bg-surface-container', color)}>
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
    <div className="flex flex-col min-w-0">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</span>
      {loading ? (
        <div className="h-7 w-16 bg-surface-container-high rounded mt-1 animate-pulse" />
      ) : (
        <span className="font-display-hero text-3xl font-bold text-on-surface mt-0.5">{value ?? '—'}</span>
      )}
      {sub && <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{sub}</span>}
    </div>
  </div>
);

// ── Confirm / Action Modal ────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body, confirmLabel, confirmClass, requireReason, working }) => {
  const [reason, setReason] = useState('');
  const handleConfirm = () => {
    onConfirm(requireReason ? reason : undefined);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-space-md">
        <p className="font-body-md text-body-md text-on-surface-variant">{body}</p>
        {requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason (required for audit log)..."
            className="w-full bg-surface-container rounded-lg px-space-sm py-space-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        )}
        <div className="flex gap-space-sm justify-end">
          <button type="button" onClick={onClose}
            className="px-space-md py-space-sm rounded-lg border border-outline-variant/30 text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container transition-all">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={working || (requireReason && !reason.trim())}
            className={cn('px-space-md py-space-sm rounded-lg font-headline-sm text-headline-sm flex items-center gap-1 disabled:opacity-60 transition-all', confirmClass)}>
            {working && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Report Detail Panel ────────────────────────────────────────────────────────
const ReportDetailPanel = ({ report, onClose, onAction, working }) => {
  const [status, setStatus] = useState('resolved');
  const [resolution, setResolution] = useState('');

  if (!report) return null;
  const target = report.targetDoc;

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-space-md py-space-md bg-surface-container shadow-sm">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Report Detail</h3>
          <span className="font-code-sm text-code-sm text-on-surface-variant">#{report._id?.slice(-8)}</span>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-md">
        {/* Status + Reason */}
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className={cn('px-space-sm py-0.5 rounded-full font-label-sm text-label-sm border font-semibold', STATUS_COLORS[report.status] || STATUS_COLORS.pending)}>
            {report.status?.toUpperCase()}
          </span>
          <span className="px-space-sm py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-on-surface border border-outline-variant/20">
            {REASON_LABELS[report.reason] || report.reason}
          </span>
          <span className="px-space-sm py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-on-surface-variant border border-outline-variant/20">
            Target: {report.targetType}
          </span>
        </div>

        {/* Reporter */}
        <div className="p-space-sm rounded-lg bg-surface-container-low">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Filed By</span>
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-headline-sm text-headline-sm">
              {(report.reporterId?.fullName || '?')[0]}
            </div>
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface block">{report.reporterId?.fullName}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{report.reporterId?.email}</span>
            </div>
          </div>
          {report.details && (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm border-t border-outline-variant/20 pt-space-sm">
              "{report.details}"
            </p>
          )}
          <span className="font-label-sm text-label-sm text-on-surface-variant block mt-1">{timeAgo(report.createdAt)}</span>
        </div>

        {/* Target Context */}
        {target && (
          <div className="p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">
              {report.targetType === 'listing' ? 'Reported Listing' : 'Reported User'}
            </span>
            {report.targetType === 'listing' ? (
              <>
                <div className="flex items-center justify-between">
                  <Link to={`/listings/${target._id}`} className="font-headline-sm text-headline-sm text-secondary hover:underline">
                    {target.title}
                  </Link>
                  <span className={cn('px-space-xs py-0.5 rounded-full font-label-sm text-label-sm border', {
                    'bg-secondary-container text-on-secondary-container border-secondary/20': target.status === 'active',
                    'bg-error-container text-on-error-container border-error/20': target.status === 'hidden',
                    'bg-amber-50 text-amber-700 border-amber-200': target.status === 'pending',
                  })}>
                    {target.status}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{target.campus} · Rs. {target.price?.toLocaleString('en-LK')}</span>
                {target.sellerId && (
                  <span className="font-body-sm text-body-sm text-on-surface-variant block">
                    Seller: {target.sellerId.fullName} ({target.sellerId.email})
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-headline-sm text-headline-sm text-on-surface block">{target.fullName}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant block">{target.email}</span>
                <div className="flex items-center gap-space-xs mt-1">
                  <span className="px-space-xs py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container border border-outline-variant/20">{target.role}</span>
                  {target.isSuspended && <span className="px-space-xs py-0.5 rounded-full font-label-sm text-label-sm bg-error-container text-on-error-container border-error/20">Suspended</span>}
                  {target.isVerified && <span className="px-space-xs py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-container text-on-secondary-container">Verified</span>}
                </div>
              </>
            )}
          </div>
        )}

        {/* Related Reports */}
        {report.relatedReports?.length > 0 && (
          <div className="p-space-sm rounded-lg bg-surface-container-low">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
              Related Reports on Same Target ({report.relatedReports.length})
            </span>
            {report.relatedReports.map((r) => (
              <div key={r._id} className="flex items-center justify-between py-1 border-b border-outline-variant/10 last:border-0">
                <span className="font-body-sm text-body-sm text-on-surface">{REASON_LABELS[r.reason]}</span>
                <div className="flex items-center gap-space-xs">
                  <span className={cn('px-space-xs py-0.5 rounded-full font-label-sm text-label-sm border text-[10px]', STATUS_COLORS[r.status])}>
                    {r.status}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resolve / Dismiss */}
        {report.status === 'pending' && (
          <div className="p-space-sm rounded-lg bg-surface-container border border-outline-variant/20">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-space-sm">Take Action</span>
            <div className="flex gap-space-xs mb-space-sm">
              {['resolved', 'dismissed'].map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn('flex-1 py-1.5 rounded-lg font-label-sm text-label-sm border transition-all capitalize',
                    status === s ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:bg-surface-container')}>
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
              placeholder="Resolution notes (optional)..."
              className="w-full bg-surface-container-lowest rounded-lg px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20 resize-none mb-space-sm"
            />
            <button type="button" onClick={() => onAction('report', report._id, status, resolution)} disabled={working}
              className="w-full py-2 rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
              {working && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              <span className="material-symbols-outlined text-base">check_circle</span>
              Mark as {status}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Moderation Console ────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'reports', label: 'Reports', icon: 'flag' },
  { id: 'users', label: 'Users', icon: 'people' },
  { id: 'listings', label: 'Listings', icon: 'sell' },
  { id: 'verification', label: 'Verification', icon: 'verified_user' },
  { id: 'audit', label: 'Audit Log', icon: 'history' },
];

export const ModerationConsole = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Reports tab
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilters, setReportFilters] = useState({ status: '', targetType: '' });
  const [reportPage, setReportPage] = useState(1);
  const [reportPagination, setReportPagination] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Users tab
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilters, setUserFilters] = useState({ role: '', suspended: '', verified: '', search: '' });
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState(null);

  // Listings tab
  const [adminListings, setAdminListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingFilters, setListingFilters] = useState({ status: '' });
  const [listingPage, setListingPage] = useState(1);
  const [listingPagination, setListingPagination] = useState(null);

  // Verification queue
  const [verQueue, setVerQueue] = useState([]);
  const [verLoading, setVerLoading] = useState(false);

  // Audit log
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState(null);

  // Action state
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState(null); // { type, id, title, body, requireReason }

  // ── Load Stats ───────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data.stats);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Tab data loaders ─────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await getAdminReports({ ...reportFilters, page: reportPage });
      setReports(data.reports || []);
      setReportPagination(data.pagination);
    } finally {
      setReportsLoading(false);
    }
  }, [reportFilters, reportPage]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await getAdminUsers({ ...userFilters, page: userPage });
      setUsers(data.users || []);
      setUserPagination(data.pagination);
    } finally {
      setUsersLoading(false);
    }
  }, [userFilters, userPage]);

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const data = await getAdminListings({ ...listingFilters, page: listingPage });
      setAdminListings(data.listings || []);
      setListingPagination(data.pagination);
    } finally {
      setListingsLoading(false);
    }
  }, [listingFilters, listingPage]);

  const loadVerQueue = useCallback(async () => {
    setVerLoading(true);
    try {
      const data = await getVerificationQueue();
      setVerQueue(data.users || []);
    } finally {
      setVerLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await getAuditLog({ page: auditPage });
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    if (activeTab === 'reports') loadReports();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'listings') loadListings();
    else if (activeTab === 'verification') loadVerQueue();
    else if (activeTab === 'audit') loadAudit();
  }, [activeTab, loadReports, loadUsers, loadListings, loadVerQueue, loadAudit]);

  // ── Report detail ────────────────────────────────────────────────────────────
  const selectReport = async (report) => {
    setSelectedReport(report._id);
    setDetailLoading(true);
    try {
      const data = await getAdminReportById(report._id);
      setReportDetail(data.report);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleAction = async (type, id, action, extra) => {
    setWorking(true);
    setActionError('');
    try {
      if (type === 'report') {
        await updateReport(id, { status: action, resolution: extra });
        setReportDetail((r) => r ? { ...r, status: action } : r);
        loadReports();
        loadStats();
      } else if (type === 'suspend') {
        await adminSuspendUser(id, extra);
        loadUsers(); loadStats();
      } else if (type === 'unsuspend') {
        await adminUnsuspendUser(id);
        loadUsers(); loadStats();
      } else if (type === 'hide') {
        await adminHideListing(id, extra);
        loadListings(); loadStats();
      } else if (type === 'approve_listing') {
        await adminApproveListing(id);
        loadListings(); loadStats();
      } else if (type === 'verify') {
        await approveVerification(id);
        loadVerQueue(); loadStats();
      } else if (type === 'role') {
        await changeUserRole(id, extra);
        loadUsers();
      }
    } catch (err) {
      setActionError(err.message || 'Action failed. Please try again.');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-md">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-on-surface-variant mb-1">
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span className="font-body-sm text-body-sm">/</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-error">
              Moderation Console
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Campus Safety & Moderation</h1>
        </div>
        <div className="flex items-center gap-space-sm">
          <div className="px-space-sm py-space-xs rounded-full bg-surface-container shadow-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-sm">shield</span>
            <span className="font-code-sm text-code-sm text-on-surface font-semibold">{user?.role?.toUpperCase()}</span>
          </div>
          <button type="button" onClick={loadStats} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-space-md px-space-md py-space-sm rounded-lg bg-error-container/40 text-error font-body-sm text-body-sm flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-base">error</span>
          {actionError}
          <button type="button" onClick={() => setActionError('')} className="ml-auto">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-sm mb-space-md">
        <StatCard icon="flag" label="Open Reports" value={stats?.openReports} color="text-error" loading={statsLoading} sub={`${stats?.reviewedToday ?? '—'} resolved today`} />
        <StatCard icon="people" label="Total Users" value={stats?.totalUsers} loading={statsLoading} sub={`${stats?.verifiedUsers ?? '—'} verified`} />
        <StatCard icon="block" label="Suspended" value={stats?.suspendedUsers} color="text-error" loading={statsLoading} />
        <StatCard icon="pending_actions" label="Pending Verif." value={stats?.pendingVerification} color="text-amber-600" loading={statsLoading} />
        <StatCard icon="visibility_off" label="Hidden" value={stats?.hiddenListings} color="text-on-surface-variant" loading={statsLoading} sub={`of ${stats?.totalListings ?? '—'} total`} />
      </div>

      {/* Tab Nav */}
      <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1 mb-space-md overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-space-xs px-space-md py-space-xs rounded-lg font-headline-sm text-headline-sm whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
            )}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
            {tab.id === 'reports' && stats?.openReports > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[10px]">
                {stats.openReports}
              </span>
            )}
            {tab.id === 'verification' && stats?.pendingVerification > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-label-sm text-[10px]">
                {stats.pendingVerification}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {[
            { icon: 'flag', label: 'Open Reports Awaiting Review', value: stats?.openReports, action: () => setActiveTab('reports'), color: 'text-error bg-error-container/30' },
            { icon: 'pending_actions', label: 'Users Pending Verification', value: stats?.pendingVerification, action: () => setActiveTab('verification'), color: 'text-amber-700 bg-amber-50' },
            { icon: 'block', label: 'Currently Suspended Accounts', value: stats?.suspendedUsers, action: () => { setActiveTab('users'); setUserFilters(f => ({ ...f, suspended: 'true' })); }, color: 'text-error bg-error-container/30' },
            { icon: 'visibility_off', label: 'Hidden Listings', value: stats?.hiddenListings, action: () => { setActiveTab('listings'); setListingFilters(f => ({ ...f, status: 'hidden' })); }, color: 'text-on-surface-variant bg-surface-container' },
          ].map((item) => (
            <button key={item.label} type="button" onClick={item.action}
              className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm text-left hover:shadow-md transition-all group flex items-center gap-space-md">
              <div className={cn('p-3 rounded-xl', item.color)}>
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-body-sm text-body-sm text-on-surface-variant block">{item.label}</span>
                {statsLoading
                  ? <div className="h-7 w-12 bg-surface-container-high rounded mt-1 animate-pulse" />
                  : <span className="font-display-hero text-3xl font-bold text-on-surface">{item.value ?? '—'}</span>
                }
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface transition-colors">arrow_forward</span>
            </button>
          ))}

          <div className="md:col-span-2 p-space-md rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex items-center gap-space-xs mb-space-sm">
              <span className="material-symbols-outlined text-secondary text-base">verified_user</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Campus Safety Guidelines</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
              {[
                { icon: 'gavel', title: 'Evidence-Based', body: 'Only take action when report evidence clearly supports a policy violation. Review all context before acting.' },
                { icon: 'history', title: 'Always Logged', body: 'Every moderator action is recorded in the audit log with actor, timestamp, and reason for accountability.' },
                { icon: 'balance', title: 'Proportionate', body: 'Use the least severe action first. Warn → hide listing → suspend account. Reserve bans for repeat violations.' },
              ].map((g) => (
                <div key={g.title} className="flex gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                  <span className="material-symbols-outlined text-secondary shrink-0">{g.icon}</span>
                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface block">{g.title}</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{g.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
          {/* Report List */}
          <div className="xl:col-span-5 flex flex-col gap-space-sm">
            {/* Filters */}
            <div className="flex flex-wrap gap-space-xs bg-surface-container-lowest rounded-xl p-space-sm shadow-sm">
              <select
                value={reportFilters.status}
                onChange={(e) => { setReportFilters(f => ({ ...f, status: e.target.value })); setReportPage(1); }}
                className="h-8 px-space-sm rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <select
                value={reportFilters.targetType}
                onChange={(e) => { setReportFilters(f => ({ ...f, targetType: e.target.value })); setReportPage(1); }}
                className="h-8 px-space-sm rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">All Types</option>
                <option value="listing">Listing</option>
                <option value="user">User</option>
                <option value="message">Message</option>
                <option value="conversation">Conversation</option>
              </select>
            </div>

            {/* List */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              {reportsLoading ? (
                <div className="p-space-md flex flex-col gap-space-sm">
                  {[1,2,3].map((i) => <div key={i} className="h-16 bg-surface-container-high rounded-lg animate-pulse" />)}
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center py-space-2xl gap-space-sm text-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">check_circle</span>
                  <p className="font-headline-sm text-headline-sm text-on-surface">No reports found</p>
                </div>
              ) : (
                reports.map((r) => (
                  <button key={r._id} type="button" onClick={() => selectReport(r)}
                    className={cn(
                      'w-full text-left px-space-md py-space-sm hover:bg-surface-container transition-all border-b border-outline-variant/10 last:border-0 flex items-start gap-space-sm',
                      selectedReport === r._id ? 'bg-surface-container shadow-[inset_4px_0_0_0] shadow-secondary' : ''
                    )}>
                    <div className={cn('mt-1 w-2 h-2 rounded-full shrink-0', r.status === 'pending' ? 'bg-error' : r.status === 'resolved' ? 'bg-secondary' : 'bg-on-surface-variant/30')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                          {REASON_LABELS[r.reason] || r.reason}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{timeAgo(r.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-space-xs mt-0.5">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">on {r.targetType}</span>
                        <span className={cn('px-space-xs py-0.5 rounded-full font-label-sm text-[10px] border', STATUS_COLORS[r.status])}>
                          {r.status}
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">by {r.reporterId?.fullName}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Pagination */}
            {reportPagination && reportPagination.pages > 1 && (
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setReportPage((p) => Math.max(1, p - 1))} disabled={reportPage <= 1}
                  className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">
                  Previous
                </button>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Page {reportPage} of {reportPagination.pages} · {reportPagination.total} total
                </span>
                <button type="button" onClick={() => setReportPage((p) => Math.min(reportPagination.pages, p + 1))} disabled={reportPage >= reportPagination.pages}
                  className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="xl:col-span-7 min-h-[400px]">
            {detailLoading ? (
              <div className="h-full bg-surface-container-lowest rounded-xl shadow-sm animate-pulse" />
            ) : reportDetail ? (
              <ReportDetailPanel
                report={reportDetail}
                onClose={() => { setSelectedReport(null); setReportDetail(null); }}
                onAction={handleAction}
                working={working}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl shadow-sm gap-space-sm text-center px-space-xl">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">flag</span>
                <p className="font-headline-sm text-headline-sm text-on-surface">Select a report</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">Click a report from the left to view context and take action.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── USERS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-space-sm">
          {/* Filters */}
          <div className="flex flex-wrap gap-space-xs bg-surface-container-lowest rounded-xl p-space-sm shadow-sm">
            <input
              type="text"
              value={userFilters.search}
              onChange={(e) => { setUserFilters(f => ({ ...f, search: e.target.value })); setUserPage(1); }}
              placeholder="Search by name or email..."
              className="h-8 px-space-sm rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20 min-w-[200px]"
            />
            {[
              { key: 'role', options: [['', 'All Roles'], ['student', 'Students'], ['moderator', 'Moderators'], ['admin', 'Admins']] },
              { key: 'suspended', options: [['', 'Any Status'], ['true', 'Suspended'], ['false', 'Active']] },
              { key: 'verified', options: [['', 'Any Verification'], ['true', 'Verified'], ['false', 'Unverified']] },
            ].map(({ key, options }) => (
              <select key={key} value={userFilters[key]}
                onChange={(e) => { setUserFilters(f => ({ ...f, [key]: e.target.value })); setUserPage(1); }}
                className="h-8 px-space-sm rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface focus:outline-none">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-container border-b border-outline-variant/20">
                <tr>
                  {['User', 'Email', 'Role', 'Campus', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-space-md py-space-sm text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-space-md py-space-sm"><div className="h-8 bg-surface-container-high rounded animate-pulse" /></td></tr>
                  ))
                ) : users.map((u) => (
                  <tr key={u._id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50 transition-colors">
                    <td className="px-space-md py-space-sm">
                      <div className="flex items-center gap-space-xs">
                        <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-headline-sm text-headline-sm shrink-0">
                          {(u.fullName || '?')[0]}
                        </div>
                        <span className="font-headline-sm text-headline-sm text-on-surface">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{u.email}</td>
                    <td className="px-space-md py-space-sm">
                      <span className={cn('px-space-xs py-0.5 rounded-full font-label-sm text-label-sm border',
                        u.role === 'admin' ? 'bg-error-container text-on-error-container border-error/20' :
                        u.role === 'moderator' ? 'bg-secondary-container text-on-secondary-container border-secondary/20' :
                        'bg-surface-container text-on-surface-variant border-outline-variant/20')}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{u.campus || '—'}</td>
                    <td className="px-space-md py-space-sm">
                      <div className="flex flex-col gap-0.5">
                        {u.isSuspended && <span className="px-space-xs py-0.5 rounded-full font-label-sm text-[10px] bg-error-container text-on-error-container inline-block w-fit">Suspended</span>}
                        {u.isVerified && <span className="px-space-xs py-0.5 rounded-full font-label-sm text-[10px] bg-secondary-container text-on-secondary-container inline-block w-fit">Verified</span>}
                        {!u.isSuspended && !u.isVerified && <span className="font-body-sm text-body-sm text-on-surface-variant">Active</span>}
                      </div>
                    </td>
                    <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{timeAgo(u.createdAt)}</td>
                    <td className="px-space-md py-space-sm">
                      <div className="flex items-center gap-1">
                        {u.isSuspended ? (
                          <button type="button"
                            onClick={() => setConfirm({ type: 'unsuspend', id: u._id, title: `Unsuspend ${u.fullName}`, body: `Remove suspension from ${u.fullName}?` })}
                            className="p-1.5 rounded-lg text-secondary hover:bg-secondary-container/30 transition-colors" title="Unsuspend">
                            <span className="material-symbols-outlined text-base">lock_open</span>
                          </button>
                        ) : (
                          <button type="button"
                            onClick={() => setConfirm({ type: 'suspend', id: u._id, title: `Suspend ${u.fullName}`, body: `Suspend account for ${u.fullName}? They will be blocked from all platform access.`, requireReason: true })}
                            className="p-1.5 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Suspend">
                            <span className="material-symbols-outlined text-base">block</span>
                          </button>
                        )}
                        {isAdmin && u._id !== user?._id && (
                          <select
                            value={u.role}
                            onChange={(e) => handleAction('role', u._id, null, e.target.value)}
                            className="h-7 px-1 rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20"
                          >
                            <option value="student">Student</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usersLoading && users.length === 0 && (
              <div className="text-center py-space-xl font-body-md text-body-md text-on-surface-variant">No users found</div>
            )}
          </div>

          {userPagination && userPagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage <= 1}
                className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">Previous</button>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Page {userPage} of {userPagination.pages} · {userPagination.total} users</span>
              <button type="button" onClick={() => setUserPage((p) => Math.min(userPagination.pages, p + 1))} disabled={userPage >= userPagination.pages}
                className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">Next</button>
            </div>
          )}
        </div>
      )}

      {/* ── LISTINGS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'listings' && (
        <div className="flex flex-col gap-space-sm">
          <div className="flex flex-wrap gap-space-xs bg-surface-container-lowest rounded-xl p-space-sm shadow-sm">
            <select value={listingFilters.status}
              onChange={(e) => { setListingFilters(f => ({ ...f, status: e.target.value })); setListingPage(1); }}
              className="h-8 px-space-sm rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface focus:outline-none">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="hidden">Hidden</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-container border-b border-outline-variant/20">
                <tr>
                  {['Title', 'Seller', 'Campus', 'Price', 'Status', 'Posted', 'Actions'].map((h) => (
                    <th key={h} className="px-space-md py-space-sm text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listingsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-space-md py-space-sm"><div className="h-8 bg-surface-container-high rounded animate-pulse" /></td></tr>
                  ))
                ) : adminListings.map((l) => (
                  <tr key={l._id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50 transition-colors">
                    <td className="px-space-md py-space-sm">
                      <Link to={`/listings/${l._id}`} className="font-headline-sm text-headline-sm text-secondary hover:underline truncate block max-w-[200px]">
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
                      <div>{l.sellerId?.fullName}</div>
                      <div className="text-[11px]">{l.sellerId?.email}</div>
                    </td>
                    <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{l.campus}</td>
                    <td className="px-space-md py-space-sm font-headline-sm text-headline-sm text-on-surface">
                      {l.price > 0 ? `Rs. ${l.price.toLocaleString('en-LK')}` : 'Free'}
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className={cn('px-space-xs py-0.5 rounded-full font-label-sm text-[10px] border',
                        l.status === 'active' ? 'bg-secondary-container text-on-secondary-container border-secondary/20' :
                        l.status === 'hidden' ? 'bg-error-container text-on-error-container border-error/20' :
                        l.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-surface-container text-on-surface-variant border-outline-variant/20')}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{timeAgo(l.createdAt)}</td>
                    <td className="px-space-md py-space-sm">
                      <div className="flex items-center gap-1">
                        {l.status !== 'hidden' ? (
                          <button type="button"
                            onClick={() => setConfirm({ type: 'hide', id: l._id, title: `Hide Listing`, body: `Hide "${l.title}"? It will no longer be visible to students.`, requireReason: true })}
                            className="p-1.5 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Hide listing">
                            <span className="material-symbols-outlined text-base">visibility_off</span>
                          </button>
                        ) : (
                          <button type="button"
                            onClick={() => handleAction('approve_listing', l._id)}
                            className="p-1.5 rounded-lg text-secondary hover:bg-secondary-container/30 transition-colors" title="Restore listing">
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                        )}
                        {l.status === 'pending' && (
                          <button type="button"
                            onClick={() => handleAction('approve_listing', l._id)}
                            className="p-1.5 rounded-lg text-secondary hover:bg-secondary-container/30 transition-colors" title="Approve listing">
                            <span className="material-symbols-outlined text-base">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listingsLoading && adminListings.length === 0 && (
              <div className="text-center py-space-xl font-body-md text-body-md text-on-surface-variant">No listings found</div>
            )}
          </div>

          {listingPagination && listingPagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setListingPage((p) => Math.max(1, p - 1))} disabled={listingPage <= 1}
                className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">Previous</button>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Page {listingPage} of {listingPagination.pages}</span>
              <button type="button" onClick={() => setListingPage((p) => Math.min(listingPagination.pages, p + 1))} disabled={listingPage >= listingPagination.pages}
                className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">Next</button>
            </div>
          )}
        </div>
      )}

      {/* ── VERIFICATION TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'verification' && (
        <div className="flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="px-space-md py-space-sm bg-surface-container border-b border-outline-variant/20 flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-amber-500 text-base">pending_actions</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Unverified Students ({verQueue.length})
              </span>
            </div>
            {verLoading ? (
              <div className="p-space-md flex flex-col gap-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-surface-container-high rounded animate-pulse" />)}</div>
            ) : verQueue.length === 0 ? (
              <div className="flex flex-col items-center py-space-2xl gap-space-sm">
                <span className="material-symbols-outlined text-4xl text-secondary">verified_user</span>
                <p className="font-headline-sm text-headline-sm text-on-surface">All users verified!</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>
                    {['Name', 'Email', 'Campus', 'Faculty', 'Joined', 'Action'].map((h) => (
                      <th key={h} className="px-space-md py-space-sm text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {verQueue.map((u) => (
                    <tr key={u._id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50">
                      <td className="px-space-md py-space-sm font-headline-sm text-headline-sm text-on-surface">{u.fullName}</td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{u.email}</td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{u.campus || '—'}</td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{u.faculty || '—'}</td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">{timeAgo(u.createdAt)}</td>
                      <td className="px-space-md py-space-sm">
                        <button type="button" onClick={() => handleAction('verify', u._id)} disabled={working}
                          className="inline-flex items-center gap-1 px-space-sm py-1 rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all disabled:opacity-60">
                          <span className="material-symbols-outlined text-sm">verified_user</span>
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="px-space-md py-space-sm bg-surface-container border-b border-outline-variant/20 flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-base">history</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Audit Trail</span>
            </div>
            {auditLoading ? (
              <div className="p-space-md flex flex-col gap-2">{[1,2,3,4].map((i) => <div key={i} className="h-10 bg-surface-container-high rounded animate-pulse" />)}</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-space-xl font-body-md text-body-md text-on-surface-variant">No audit entries yet</div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {auditLogs.map((log) => (
                  <div key={log._id} className="flex items-start gap-space-sm px-space-md py-space-sm hover:bg-surface-container/50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className="font-headline-sm text-headline-sm text-on-surface">{log.actorId?.fullName}</span>
                        <span className="font-code-sm text-code-sm text-secondary">{log.action}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">on {log.targetType}</span>
                      </div>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {Object.entries(log.meta).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{timeAgo(log.createdAt)}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant block">{log.actorId?.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {auditPagination && auditPagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage <= 1}
                className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">Previous</button>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Page {auditPage} of {auditPagination.pages}</span>
              <button type="button" onClick={() => setAuditPage((p) => Math.min(auditPagination.pages, p + 1))} disabled={auditPage >= auditPagination.pages}
                className="px-space-sm py-1 rounded-lg border border-outline-variant/30 font-body-sm text-body-sm disabled:opacity-40 hover:bg-surface-container">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirm(null)}
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.type === 'suspend' ? 'Suspend Account' : confirm.type === 'hide' ? 'Hide Listing' : 'Confirm'}
          confirmClass={
            confirm.type === 'suspend' || confirm.type === 'hide'
              ? 'bg-error text-on-error hover:bg-error/90'
              : 'bg-secondary text-on-secondary hover:bg-secondary/90'
          }
          requireReason={confirm.requireReason}
          working={working}
          onConfirm={(reason) => handleAction(confirm.type, confirm.id, null, reason)}
        />
      )}
    </div>
  );
};
