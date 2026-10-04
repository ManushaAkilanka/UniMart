import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  getConversations,
  getConversationMessages,
  sendMessage,
  respondToProposal,
  blockUser,
  unblockUser,
  submitReport,
  createConversation,
} from '../utils/api';
import { cn } from '../utils/cn';
import { Modal } from '../components/ui/Modal';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Escapes HTML special characters for safe text rendering.
 * Text is stored raw in DB; this escapes on render.
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const AvatarCircle = ({ user, size = 10, className }) => {
  const initials = (user?.fullName || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.fullName}
      className={cn(`w-${size} h-${size} rounded-full object-cover shrink-0`, className)}
    />
  ) : (
    <div
      className={cn(
        `w-${size} h-${size} rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-headline-sm text-headline-sm shrink-0`,
        className
      )}
    >
      {initials}
    </div>
  );
};

const ConversationItem = ({ conv, isActive, currentUserId, onClick }) => {
  const other =
    conv.buyerId?._id?.toString() === currentUserId?.toString() ? conv.sellerId : conv.buyerId;
  const listing = conv.listingId;
  const lastMsg = conv.lastMessage;
  const unread = conv.unreadCount || 0;

  return (
    <button
      type="button"
      onClick={() => onClick(conv)}
      className={cn(
        'w-full text-left p-space-md transition-all flex items-start gap-space-sm hover:bg-surface-container',
        isActive
          ? 'bg-surface-container-lowest shadow-[inset_4px_0_0_0] shadow-secondary'
          : 'border-b border-outline-variant/10'
      )}
    >
      <div className="relative shrink-0">
        <AvatarCircle user={other} size={12} />
        {other?.isVerified && (
          <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-secondary text-sm bg-surface rounded-full">
            verified
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-headline-sm text-headline-sm text-on-surface truncate">
            {other?.fullName || 'Student'}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 ml-1">
            {timeAgo(conv.lastMessageAt || conv.updatedAt)}
          </span>
        </div>

        {listing && (
          <div className="flex items-center gap-space-xs mb-1 px-space-xs py-0.5 rounded bg-surface-container w-fit max-w-full">
            <span className="material-symbols-outlined text-on-surface-variant text-xs shrink-0">
              sell
            </span>
            <span className="font-code-sm text-code-sm text-on-surface truncate">
              {listing.title}
              {listing.price > 0 && ` · Rs. ${listing.price.toLocaleString('en-LK')}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-space-xs">
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate flex-1">
            {lastMsg
              ? lastMsg.messageType === 'meetup_proposal'
                ? '📍 Meetup proposal'
                : escapeHtml(lastMsg.body)
              : 'Start the conversation'}
          </p>
          {unread > 0 && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-secondary" />
          )}
        </div>
      </div>
    </button>
  );
};

const MeetupProposalCard = ({ message, isOwn, currentUserId, onRespond }) => {
  const p = message.proposalDetails || {};
  const statusColors = {
    proposed: 'bg-surface-container text-on-surface',
    accepted: 'bg-secondary-container text-on-secondary-container',
    declined: 'bg-error-container text-on-error-container',
  };
  const canRespond = !isOwn && p.status === 'proposed';

  return (
    <div className="my-space-xs p-space-md rounded-xl bg-surface-container-lowest shadow-md max-w-lg self-center w-full border border-outline-variant/20">
      <div className="flex items-start justify-between gap-space-sm pb-space-sm border-b border-outline-variant/15 mb-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-xl">location_on</span>
          <div>
            <h4 className="font-headline-md text-headline-md text-on-surface">
              Campus Meetup Proposal
            </h4>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Verified Public Academic Exchange Zone
            </span>
          </div>
        </div>
        <span
          className={cn(
            'px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 shrink-0',
            statusColors[p.status] || statusColors.proposed
          )}
        >
          <span className="material-symbols-outlined text-xs">
            {p.status === 'accepted' ? 'check_circle' : p.status === 'declined' ? 'cancel' : 'schedule'}
          </span>
          {p.status === 'accepted' ? 'Accepted' : p.status === 'declined' ? 'Declined' : 'Pending'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mb-space-sm">
        <div className="p-space-sm rounded-lg bg-surface-container-low">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block mb-0.5">
            Location
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface block">
            {p.location}
          </span>
          {p.locationNotes && (
            <span className="font-body-sm text-body-sm text-secondary">{p.locationNotes}</span>
          )}
        </div>
        <div className="p-space-sm rounded-lg bg-surface-container-low">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block mb-0.5">
            Handover Time
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface block">
            {p.meetupTime}
          </span>
          {p.timeNotes && (
            <span className="font-body-sm text-body-sm text-on-surface-variant">{p.timeNotes}</span>
          )}
        </div>
      </div>

      {p.amount != null && (
        <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex items-center justify-between mb-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant block">
              Agreed Settlement Amount
            </span>
            <span className="font-price-lg text-price-lg text-on-surface">
              Rs. {p.amount.toLocaleString('en-LK')}
            </span>
          </div>
          <div className="text-right">
            <span className="font-label-sm text-label-sm text-secondary font-semibold block">
              Payment Terms
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Cash / In-person upon inspection
            </span>
          </div>
        </div>
      )}

      {/* Body text */}
      <p
        className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm"
        dangerouslySetInnerHTML={{ __html: escapeHtml(message.body) }}
      />

      {canRespond && (
        <div className="flex gap-space-sm">
          <button
            type="button"
            onClick={() => onRespond(message._id, 'accepted')}
            className="flex-1 h-9 rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all flex items-center justify-center gap-1 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">handshake</span>
            Accept Meetup
          </button>
          <button
            type="button"
            onClick={() => onRespond(message._id, 'declined')}
            className="flex-1 h-9 rounded-lg border border-outline-variant/30 text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container transition-all flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-base">cancel</span>
            Decline
          </button>
        </div>
      )}
    </div>
  );
};

// ── Report Modal ──────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or unsolicited messages' },
  { value: 'harassment', label: 'Harassment or threatening behavior' },
  { value: 'fraud', label: 'Fraud or misleading offer' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetName }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { setErr('Please select a reason.'); return; }
    setSubmitting(true);
    setErr('');
    try {
      await submitReport({ targetType, targetId, reason, details });
      setDone(true);
    } catch (ex) {
      setErr(ex.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason(''); setDetails(''); setDone(false); setErr(''); onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={done ? 'Report Submitted' : `Report ${targetName || 'User'}`}
      subtitle={done ? undefined : 'Help keep UniMart safe for all students'}
    >
      {done ? (
        <div className="flex flex-col items-center text-center py-space-md gap-space-sm">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-3xl">verified_user</span>
          </div>
          <h4 className="font-headline-md text-headline-md text-on-surface">
            Thank you for keeping campus safe
          </h4>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
            Our campus safety team will review your report within 24 hours.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Reason
            </label>
            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex items-center gap-space-sm p-space-sm rounded-lg border cursor-pointer transition-all',
                    reason === r.value
                      ? 'border-secondary bg-secondary-container/20'
                      : 'border-outline-variant/30 hover:bg-surface-container'
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-[#006c4a]"
                  />
                  <span className="font-body-md text-body-md text-on-surface">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Additional Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Describe what happened..."
              className="w-full bg-surface-container rounded-lg px-space-sm py-space-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20 resize-none"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant text-right">
              {details.length}/1000
            </span>
          </div>

          {err && (
            <p className="font-body-sm text-body-sm text-error bg-error-container/40 px-space-sm py-space-xs rounded-lg">
              {err}
            </p>
          )}

          <div className="flex gap-space-sm justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-space-md py-space-sm rounded-lg border border-outline-variant/30 text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-space-md py-space-sm rounded-lg bg-error text-on-error font-headline-sm text-headline-sm hover:bg-error/90 transition-all disabled:opacity-60 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">flag</span>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// ── Meetup Proposal Modal ─────────────────────────────────────────────────────
const MeetupProposalModal = ({ isOpen, onClose, onSubmit, submitting }) => {
  const [location, setLocation] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [timeNotes, setTimeNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim()) { setErr('Location is required.'); return; }
    if (!meetupTime.trim()) { setErr('Handover time is required.'); return; }
    setErr('');
    onSubmit({
      body: body.trim() || `Proposed meetup at ${location}`,
      messageType: 'meetup_proposal',
      proposalDetails: {
        location: location.trim(),
        locationNotes: locationNotes.trim() || undefined,
        meetupTime: meetupTime.trim(),
        timeNotes: timeNotes.trim() || undefined,
        amount: amount ? parseFloat(amount) : undefined,
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose Campus Meetup"
      subtitle="Arrange a safe in-person handover at a verified campus location"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Meeting Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Science Library Foyer"
              className="h-10 px-space-sm rounded-lg bg-surface-container font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            />
          </div>
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Handover Time *
            </label>
            <input
              type="text"
              value={meetupTime}
              onChange={(e) => setMeetupTime(e.target.value)}
              placeholder="e.g. Today at 1:30 PM"
              className="h-10 px-space-sm rounded-lg bg-surface-container font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Location Notes (optional)
            </label>
            <input
              type="text"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="e.g. Near security desk"
              className="h-10 px-space-sm rounded-lg bg-surface-container font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Agreed Amount (Rs.)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 6000"
              min="0"
              className="h-10 px-space-sm rounded-lg bg-surface-container font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Message (optional)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Add any message to accompany this proposal..."
            className="w-full bg-surface-container rounded-lg px-space-sm py-space-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/20 resize-none"
          />
        </div>

        <div className="flex items-start gap-space-xs p-space-sm rounded-lg bg-secondary-container/20">
          <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">verified_user</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Only propose meetups in public daylight campus areas — libraries, canteen queues, or faculty reception zones.
          </p>
        </div>

        {err && (
          <p className="font-body-sm text-body-sm text-error">{err}</p>
        )}

        <div className="flex gap-space-sm justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-space-md py-space-sm rounded-lg border border-outline-variant/30 text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all disabled:opacity-60 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">location_on</span>
            {submitting ? 'Sending...' : 'Propose Meetup'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ── Main Messaging Page ───────────────────────────────────────────────────────
export const Messages = () => {
  const { user } = useAuth();
  const { socket, isConnected, socketStatus } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(searchParams.get('conversation') || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'buying', 'selling'
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [error, setError] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, targetType: '', targetId: '', targetName: '' });
  const [meetupModal, setMeetupModal] = useState(false);
  const [blockingUser, setBlockingUser] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fallbackPollRef = useRef(null);
  const moreMenuRef = useRef(null);
  const activeConvIdRef = useRef(activeConvId);
  // Keep a ref in sync so socket event handlers always see the latest value
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  const activeConv = conversations.find((c) => c._id === activeConvId);
  const otherParticipant = activeConv
    ? activeConv.buyerId?._id?.toString() === user?._id?.toString()
      ? activeConv.sellerId
      : activeConv.buyerId
    : null;
  const listing = activeConv?.listingId;

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch {
      // silent
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  // ── Fetch messages for active conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const data = await getConversationMessages(convId);
      setMessages(data.messages || []);
      // Also refresh conversation list to update sidebar unread counts
      fetchConversations();
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, [fetchConversations]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // When active conversation changes, fetch messages and join socket room
  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      setSearchParams({ conversation: activeConvId }, { replace: true });
    }
  }, [activeConvId, fetchMessages, setSearchParams]);

  // ── Socket: join / leave conversation room ────────────────────────────────
  useEffect(() => {
    if (!socket || !activeConvId) return;

    socket.emit('join_conversation', { conversationId: activeConvId }, (res) => {
      if (res && !res.success) {
        console.warn('[Socket] Could not join conversation room:', res.error);
      }
    });

    return () => {
      socket.emit('leave_conversation', { conversationId: activeConvId });
    };
  }, [socket, activeConvId]);

  // ── Socket: listen for real-time new messages ─────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversationId, message }) => {
      // Only update message list if this is the active conversation
      if (conversationId === activeConvIdRef.current) {
        setMessages((prev) => {
          // Avoid duplicates (REST and socket may both deliver the same message)
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      // Always refresh the sidebar so unread dots and last-message previews update
      fetchConversations();
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, fetchConversations]);

  // ── Socket: listen for read receipts (update own sent message ticks) ───────
  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = ({ conversationId }) => {
      if (conversationId !== activeConvIdRef.current) return;
      // Mark all sent messages as read locally for instant tick update
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId?._id?.toString() === user?._id?.toString()
            ? { ...m, isRead: true }
            : m
        )
      );
    };

    socket.on('messages_read', handleMessagesRead);
    return () => socket.off('messages_read', handleMessagesRead);
  }, [socket, user?._id]);

  // ── Socket: listen for meetup proposal status changes ─────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleProposalChange = ({ conversationId, messageId, status, message: updatedMsg }) => {
      if (conversationId !== activeConvIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updatedMsg : m))
      );
    };

    socket.on('meetup_status_change', handleProposalChange);
    return () => socket.off('meetup_status_change', handleProposalChange);
  }, [socket]);

  // ── REST fallback poll: 30 s, only when socket is disconnected ─────────────
  useEffect(() => {
    if (!activeConvId) return;
    if (isConnected) {
      clearInterval(fallbackPollRef.current);
      return;
    }
    fallbackPollRef.current = setInterval(() => {
      fetchMessages(activeConvId, true);
    }, 30_000);
    return () => clearInterval(fallbackPollRef.current);
  }, [activeConvId, isConnected, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectConversation = (conv) => {
    setActiveConvId(conv._id);
    setMessages([]);
    setError('');
    setMoreMenuOpen(false);
    setBlocked(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !activeConvId || sendingMsg) return;
    if (trimmed.length > 1000) {
      setError('Message cannot exceed 1000 characters.');
      return;
    }
    setSendingMsg(true);
    setError('');
    try {
      await sendMessage(activeConvId, { body: trimmed, messageType: 'text' });
      setInput('');
      await fetchMessages(activeConvId, true);
    } catch (ex) {
      setError(ex.message || 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSendProposal = async (data) => {
    if (!activeConvId) return;
    setSendingMsg(true);
    try {
      await sendMessage(activeConvId, data);
      setMeetupModal(false);
      await fetchMessages(activeConvId, true);
    } catch (ex) {
      setError(ex.message || 'Failed to send proposal.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleRespondToProposal = async (messageId, status) => {
    try {
      await respondToProposal(activeConvId, messageId, status);
      await fetchMessages(activeConvId, true);
    } catch (ex) {
      setError(ex.message || 'Failed to respond to proposal.');
    }
  };

  const handleBlock = async () => {
    if (!otherParticipant || blockingUser) return;
    setBlockingUser(true);
    try {
      if (blocked) {
        await unblockUser(otherParticipant._id);
        setBlocked(false);
      } else {
        await blockUser(otherParticipant._id);
        setBlocked(true);
      }
      setMoreMenuOpen(false);
    } catch (ex) {
      setError(ex.message || 'Failed to update block status.');
    } finally {
      setBlockingUser(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // ── Filter / Search conversations ─────────────────────────────────────────
  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    const other =
      conv.buyerId?._id?.toString() === user?._id?.toString() ? conv.sellerId : conv.buyerId;
    const matchesSearch =
      !q ||
      (other?.fullName || '').toLowerCase().includes(q) ||
      (conv.listingId?.title || '').toLowerCase().includes(q);

    const isBuyer = conv.buyerId?._id?.toString() === user?._id?.toString();
    const matchesFilter =
      filter === 'all' ||
      (filter === 'buying' && isBuyer) ||
      (filter === 'selling' && !isBuyer);

    return matchesSearch && matchesFilter;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-md lg:px-margin-lg py-space-md">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">home</span>
            <span className="font-body-sm text-body-sm">/</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
              Negotiation Room
            </span>
          </div>
          {/* Socket connection status indicator */}
          <div
            className={cn(
              'inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full shadow-sm transition-colors',
              socketStatus === 'connected'
                ? 'bg-secondary-container/60'
                : socketStatus === 'connecting'
                ? 'bg-surface-container'
                : socketStatus === 'error'
                ? 'bg-error-container/40'
                : 'bg-surface-container'
            )}
            title={`Socket: ${socketStatus}`}
          >
            <span
              className={cn(
                'inline-block w-2 h-2 rounded-full',
                socketStatus === 'connected'
                  ? 'bg-secondary animate-pulse'
                  : socketStatus === 'connecting'
                  ? 'bg-on-surface-variant animate-pulse'
                  : socketStatus === 'error'
                  ? 'bg-error'
                  : 'bg-on-surface-variant/50'
              )}
            />
            <span className="font-code-sm text-code-sm text-on-surface font-medium">
              {socketStatus === 'connected'
                ? 'Live'
                : socketStatus === 'connecting'
                ? 'Connecting…'
                : socketStatus === 'error'
                ? 'Reconnecting…'
                : 'Offline (REST)'}
            </span>
          </div>
        </div>

        {/* Main Chat Container */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[760px]">

          {/* ── LEFT PANEL: Conversation List ─────────────────────────── */}
          <aside
            className={cn(
              'lg:col-span-4 bg-surface-container-low flex flex-col',
              activeConvId ? 'hidden lg:flex' : 'flex'
            )}
          >
            {/* Header */}
            <div className="p-space-md bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-md text-headline-md text-on-surface">Chats</span>
                  {totalUnread > 0 && (
                    <span className="px-space-xs py-space-2xs rounded-full bg-error text-on-error font-label-sm text-label-sm">
                      {totalUnread}
                    </span>
                  )}
                  <span className="px-space-xs py-space-2xs rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                    {filteredConversations.length} Active
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="relative flex items-center w-full">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages or listings..."
                  className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest shadow-inner transition-all"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-space-2xs p-space-2xs rounded-lg bg-surface-container font-label-md text-label-md">
                {['all', 'buying', 'selling'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      'flex-1 py-1.5 rounded-md text-center transition-all capitalize',
                      filter === f
                        ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    {f === 'all' ? `All (${conversations.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex flex-col overflow-y-auto flex-1">
              {loadingConvs ? (
                <div className="flex flex-col gap-2 p-space-md">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-space-sm">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-1/2 bg-surface-container-high rounded" />
                        <div className="h-3 w-3/4 bg-surface-container-high rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-space-2xl gap-space-sm text-center px-space-md">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                    chat_bubble_outline
                  </span>
                  <p className="font-headline-sm text-headline-sm text-on-surface">
                    No conversations yet
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Start a chat from any listing page by clicking "Message Seller".
                  </p>
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-1 px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all"
                  >
                    Browse Listings
                  </Link>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv._id}
                    conv={conv}
                    isActive={conv._id === activeConvId}
                    currentUserId={user?._id}
                    onClick={handleSelectConversation}
                  />
                ))
              )}
            </div>

            {/* Safety Pill */}
            <div className="p-space-sm m-space-sm rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-base">verified_user</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Encrypted with student ac.lk credentials.
              </p>
            </div>
          </aside>

          {/* ── RIGHT PANEL: Chat Pane ────────────────────────────────── */}
          <section
            className={cn(
              'lg:col-span-8 flex flex-col bg-surface-container-lowest',
              activeConvId ? 'flex' : 'hidden lg:flex'
            )}
          >
            {!activeConvId ? (
              <div className="flex flex-col items-center justify-center h-full gap-space-md text-center px-space-xl">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-3xl">chat_bubble</span>
                </div>
                <div>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface">
                    Select a conversation
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    Choose a chat from the left, or start one from a listing.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div>
                  {/* Seller / Buyer Bar */}
                  <div className="p-space-md bg-surface-container-lowest shadow-sm flex items-center justify-between gap-space-md">
                    {/* Back button on mobile */}
                    <button
                      type="button"
                      onClick={() => setActiveConvId(null)}
                      className="lg:hidden p-2 -ml-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </button>

                    <div className="flex items-center gap-space-sm min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <AvatarCircle user={otherParticipant} size={11} />
                        {otherParticipant?.isVerified && (
                          <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-secondary text-sm bg-surface rounded-full shadow-sm">
                            verified
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-headline-md text-headline-md text-on-surface truncate">
                            {otherParticipant?.fullName || 'Student'}
                          </span>
                          {otherParticipant?.isVerified && (
                            <span className="inline-flex items-center gap-0.5 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                              <span className="material-symbols-outlined text-xs">shield</span>
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm truncate">
                          <span className="material-symbols-outlined text-xs">school</span>
                          <span>
                            {otherParticipant?.faculty || otherParticipant?.campus || 'Campus Student'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-space-xs shrink-0">
                      {listing && (
                        <Link
                          to={`/listings/${listing._id}`}
                          className="inline-flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                          <span className="hidden sm:inline">View Listing</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setMeetupModal(true)}
                        className="inline-flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 font-headline-sm text-headline-sm transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">handshake</span>
                        <span className="hidden sm:inline">Propose Meetup</span>
                      </button>
                      {/* More Menu */}
                      <div className="relative" ref={moreMenuRef}>
                        <button
                          type="button"
                          onClick={() => setMoreMenuOpen((v) => !v)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>
                        {moreMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-surface-container-lowest rounded-xl shadow-level3 border border-outline-variant/20 overflow-hidden">
                            {listing && (
                              <Link
                                to={`/listings/${listing._id}`}
                                className="flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container text-on-surface font-body-md text-body-md transition-colors"
                              >
                                <span className="material-symbols-outlined text-base">sell</span>
                                View Listing
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={handleBlock}
                              disabled={blockingUser}
                              className="w-full flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container text-on-surface font-body-md text-body-md transition-colors disabled:opacity-60"
                            >
                              <span className="material-symbols-outlined text-base">
                                {blocked ? 'lock_open' : 'block'}
                              </span>
                              {blocked ? 'Unblock User' : 'Block User'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMoreMenuOpen(false);
                                setReportModal({
                                  open: true,
                                  targetType: 'user',
                                  targetId: otherParticipant?._id,
                                  targetName: otherParticipant?.fullName,
                                });
                              }}
                              className="w-full flex items-center gap-space-sm px-space-md py-space-sm hover:bg-error-container/40 text-error font-body-md text-body-md transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">flag</span>
                              Report User
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Listing Banner */}
                  {listing && (
                    <div className="px-space-md py-space-xs bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm shadow-inner">
                      <div className="flex items-center gap-space-sm">
                        {listing.images?.[0]?.url ? (
                          <img
                            src={listing.images[0].url}
                            alt={listing.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-surface-variant text-lg">sell</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm text-on-surface">
                            {listing.title}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {listing.status === 'active' ? 'Available' : listing.status}
                            {listing.campus && ` · ${listing.campus}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-sm">
                        {listing.status === 'active' && (
                          <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                            ● Available
                          </span>
                        )}
                        {listing.price > 0 && (
                          <span className="font-price-md text-price-md text-on-surface">
                            Rs. {listing.price.toLocaleString('en-LK')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Reply Chips */}
                  <div className="px-space-md py-space-xs bg-surface-container-lowest flex items-center gap-space-xs overflow-x-auto no-scrollbar shadow-sm">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Quick:
                    </span>
                    {[
                      'Is this still available?',
                      `Would you consider a lower price?`,
                      'Can we meet at the Main Library?',
                      'Can I inspect it before buying?',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setInput(chip)}
                        className="px-space-sm py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="p-space-md flex-1 flex flex-col gap-space-md overflow-y-auto bg-surface-container-low/30 min-h-0">
                  {error && (
                    <div className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-error-container/40 text-error font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-base">error</span>
                      {error}
                      <button
                        type="button"
                        onClick={() => setError('')}
                        className="ml-auto"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}

                  {loadingMsgs ? (
                    <div className="flex flex-col gap-space-md animate-pulse">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}
                        >
                          <div className="h-12 w-48 bg-surface-container-high rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-space-sm text-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                        chat_bubble_outline
                      </span>
                      <p className="font-headline-sm text-headline-sm text-on-surface">
                        Start the conversation
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                        Say hello or ask about the item. All transactions must happen in person on campus.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId?._id?.toString() === user?._id?.toString();

                      if (msg.messageType === 'meetup_proposal') {
                        return (
                          <MeetupProposalCard
                            key={msg._id}
                            message={msg}
                            isOwn={isOwn}
                            currentUserId={user?._id}
                            onRespond={handleRespondToProposal}
                          />
                        );
                      }

                      if (msg.messageType === 'system') {
                        return (
                          <div key={msg._id} className="flex items-center justify-center my-space-xs">
                            <span className="px-space-sm py-0.5 rounded-full bg-surface-container font-code-sm text-code-sm text-on-surface-variant">
                              {/* Escape HTML on render */}
                              <span dangerouslySetInnerHTML={{ __html: escapeHtml(msg.body) }} />
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg._id}
                          className={cn(
                            'flex gap-space-xs max-w-[80%]',
                            isOwn ? 'self-end flex-col items-end' : 'self-start items-start'
                          )}
                        >
                          {!isOwn && (
                            <AvatarCircle
                              user={msg.senderId}
                              size={7}
                              className="mt-1 shrink-0"
                            />
                          )}
                          <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
                            <div
                              className={cn(
                                'px-space-md py-space-sm rounded-xl shadow-sm font-body-md text-body-md',
                                isOwn
                                  ? 'bg-primary text-on-primary rounded-tr-none'
                                  : 'bg-surface-container-lowest text-on-surface rounded-tl-none'
                              )}
                            >
                              {/* Escaped on render */}
                              <span dangerouslySetInnerHTML={{ __html: escapeHtml(msg.body) }} />
                            </div>
                            <div className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm text-label-sm">
                              <span>{formatMsgTime(msg.createdAt)}</span>
                              {isOwn && (
                                <span
                                  className={cn(
                                    'material-symbols-outlined text-xs',
                                    msg.isRead ? 'text-secondary' : 'text-on-surface-variant'
                                  )}
                                >
                                  {msg.isRead ? 'done_all' : 'done'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Box */}
                <div className="p-space-md bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-space-xs bg-surface-container-low rounded-lg p-space-xs shadow-inner"
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      maxLength={1000}
                      placeholder={`Type your message to ${otherParticipant?.fullName?.split(' ')[0] || 'the seller'}... (Remember: Keep payments strictly in person)`}
                      className="flex-1 bg-transparent resize-none text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md focus:outline-none px-space-xs py-1"
                    />
                    <div className="flex items-center gap-space-xs shrink-0 self-end pb-1 pr-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">
                        {1000 - input.length}
                      </span>
                      <button
                        type="submit"
                        disabled={sendingMsg || !input.trim()}
                        className="px-space-md py-2 rounded-lg bg-primary hover:bg-on-surface-variant text-on-primary font-headline-sm text-headline-sm flex items-center gap-space-xs shadow-sm transition-all disabled:opacity-50"
                      >
                        <span>Send</span>
                        <span className="material-symbols-outlined text-base">send</span>
                      </button>
                    </div>
                  </form>
                  {/* Safety Notice */}
                  <div className="flex items-center gap-space-2xs px-space-xs pt-1">
                    <span className="material-symbols-outlined text-sm text-secondary">lock</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                      🔒 Phone numbers and private emails are not shown. Arrange handovers in daylight campus zones.
                    </span>
                    <span className="font-code-sm text-code-sm text-on-surface-variant ml-auto hidden md:inline shrink-0">
                      ↵ to Send
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Campus Safety Guidelines */}
        <div className="mt-space-md grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {[
            {
              icon: 'account_balance',
              title: 'Faculty Verification',
              body: 'Both parties must hold authenticated university domains (@sci.cmb.ac.lk, @mrt.ac.lk).',
            },
            {
              icon: 'visibility',
              title: 'Inspect in Daylight',
              body: 'Always test electronics, verify textbooks, and check serial numbers prior to trade.',
            },
            {
              icon: 'payments',
              title: 'Zero Advance Deposits',
              body: 'Never transfer deposit fees via reload or wire before meeting at a campus zone.',
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-sm"
            >
              <div className="p-2 rounded-lg bg-surface-container text-secondary shrink-0">
                <span className="material-symbols-outlined text-xl">{tip.icon}</span>
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface block mb-0.5">
                  {tip.title}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <ReportModal
        isOpen={reportModal.open}
        onClose={() => setReportModal({ open: false, targetType: '', targetId: '', targetName: '' })}
        targetType={reportModal.targetType}
        targetId={reportModal.targetId}
        targetName={reportModal.targetName}
      />
      <MeetupProposalModal
        isOpen={meetupModal}
        onClose={() => setMeetupModal(false)}
        onSubmit={handleSendProposal}
        submitting={sendingMsg}
      />
    </div>
  );
};
