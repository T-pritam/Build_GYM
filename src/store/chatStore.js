/**
 * chatStore.js — chat state for the member app (Zustand).
 *
 * Holds the thread list, per-thread message arrays (newest-first for the inverted
 * list), and the other party's read/delivered pointers (for ticks). Implements
 * optimistic send + offline outbox/retry and wires the `/chat` socket once.
 *
 * Fault tolerance (feasibility §2.2): the REST + SQLite path is the guarantee;
 * the socket is an accelerator. Every open does a `?after=` delta-sync so a missed
 * live event is filled in, and the outbox auto-retries on reconnect.
 */
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import * as svc from '../services/chat/chatService';
import * as sock from '../services/chat/chatSocket';
import {
  initChatCache, cacheMessages, getCachedMessages, getLastServerId,
  addOptimistic, confirmOptimistic, markFailed,
  enqueueOutbox, dequeueOutbox, getOutbox,
} from '../services/chat/chatCache';

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const dedupe = (arr) => {
  const seen = new Set();
  return arr.filter((m) => {
    const key = m.clientMsgUuid || m.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const sortNewestFirst = (arr) =>
  [...arr].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

export const useChatStore = create((set, get) => ({
  threads: [],
  messagesByThread: {},  // { threadId: [msg, …] }  newest-first
  readsByThread: {},     // { threadId: { [userId]: {lastReadMessageId, lastDeliveredMessageId} } }
  openThreadId: null,
  _wired: false,

  unreadTotal: () => get().threads.reduce((s, t) => s + (t.unread || 0), 0),

  // ── bootstrap ───────────────────────────────────────────────────────────────
  init: async () => {
    await initChatCache();
    get().wireSocket();
    await get().loadThreads();
    get().flushOutbox();
  },

  loadThreads: async () => {
    try {
      const threads = await svc.listThreads();
      set({ threads });
    } catch (e) { /* keep cached threads */ }
  },

  // ── socket wiring (once) ─────────────────────────────────────────────────────
  wireSocket: () => {
    if (get()._wired) return;
    const s = sock.getChatSocket();
    s.on('chat:message', (m) => get().handleIncoming(m));
    s.on('chat:read', ({ threadId, userId, upToMessageId }) => get().applyPointer(threadId, userId, 'lastReadMessageId', upToMessageId));
    s.on('chat:delivered', ({ threadId, userId, upToMessageId }) => get().applyPointer(threadId, userId, 'lastDeliveredMessageId', upToMessageId));
    s.on('chat:frozen', ({ threadId, state }) => set((st) => ({ threads: st.threads.map((t) => (t.id === threadId ? { ...t, state } : t)) })));
    s.on('connect', () => { get().flushOutbox(); const tid = get().openThreadId; if (tid) sock.joinThread(tid); });
    set({ _wired: true });
  },

  applyPointer: (threadId, userId, field, value) => {
    set((st) => {
      const t = { ...(st.readsByThread[threadId] || {}) };
      t[userId] = { ...(t[userId] || {}), [field]: value };
      return { readsByThread: { ...st.readsByThread, [threadId]: t } };
    });
  },

  // ── open / close a thread ────────────────────────────────────────────────────
  openThread: async (threadId) => {
    set({ openThreadId: threadId });
    sock.joinThread(threadId);

    // 1) instant paint from cache
    const cached = await getCachedMessages(threadId, 50);
    set((st) => ({ messagesByThread: { ...st.messagesByThread, [threadId]: sortNewestFirst(cached) } }));

    // 2) thread state + both parties' pointers (ticks)
    try {
      const { reads } = await svc.getThread(threadId);
      const map = {};
      (reads || []).forEach((r) => { map[r.userId] = r; });
      set((st) => ({ readsByThread: { ...st.readsByThread, [threadId]: map } }));
    } catch (e) { /* non-fatal */ }

    // 3) delta-sync anything newer than what we hold
    try {
      const after = await getLastServerId(threadId);
      const res = await svc.getMessages(threadId, after ? { after, limit: 50 } : { limit: 30 });
      const incoming = res.messages || [];
      if (incoming.length) {
        await cacheMessages(threadId, incoming);
        get().mergeMessages(threadId, incoming);
      }
    } catch (e) { /* offline → cache stands */ }

    get().markReadNewest(threadId);
  },

  closeThread: (threadId) => {
    sock.leaveThread(threadId);
    if (get().openThreadId === threadId) set({ openThreadId: null });
  },

  loadOlder: async (threadId) => {
    const list = get().messagesByThread[threadId] || [];
    const oldest = [...list].reverse().find((m) => !String(m.id).startsWith('tmp:'));
    if (!oldest) return;
    try {
      const res = await svc.getMessages(threadId, { before: oldest.id, limit: 30 });
      const older = res.messages || [];
      if (older.length) {
        await cacheMessages(threadId, older);
        get().mergeMessages(threadId, older);
      }
    } catch (e) { /* offline */ }
  },

  mergeMessages: (threadId, incoming) => {
    set((st) => {
      const cur = st.messagesByThread[threadId] || [];
      const merged = sortNewestFirst(dedupe([...incoming, ...cur]));
      return { messagesByThread: { ...st.messagesByThread, [threadId]: merged } };
    });
  },

  // ── incoming live message ────────────────────────────────────────────────────
  handleIncoming: async (m) => {
    const me = useAuthStore.getState().user?.id;
    // Our own message echoed back over the socket — trySend already persists and
    // renders it. Reprocessing collides with confirmOptimistic's SQLite transaction
    // and (the echo carries no status) would overwrite the optimistic 'sent'.
    if (m.senderId && m.senderId === me) return;
    await cacheMessages(m.threadId, [m]);
    get().mergeMessages(m.threadId, [m]);
    sock.emitDelivered(m.threadId, m.id); // ack delivery → sender's ✓✓
    if (get().openThreadId === m.threadId) {
      get().markReadNewest(m.threadId);
    } else {
      set((st) => ({
        threads: st.threads.map((t) => t.id === m.threadId
          ? { ...t, unread: (t.unread || 0) + 1, lastMessagePreview: previewOf(m), lastMessageAt: m.createdAt }
          : t),
      }));
    }
  },

  markReadNewest: (threadId) => {
    const list = get().messagesByThread[threadId] || [];
    const newest = list.find((m) => !String(m.id).startsWith('tmp:'));
    if (!newest) return;
    sock.emitRead(threadId, newest.id);
    svc.markRead(threadId, newest.id).catch(() => {});
    set((st) => ({ threads: st.threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)) }));
  },

  // ── send (optimistic + outbox + retry) ───────────────────────────────────────
  sendText: async (threadId, text) => {
    const body = (text || '').trim();
    if (!body) return;
    const user = useAuthStore.getState().user;
    const clientMsgUuid = genId();
    const optimistic = {
      id: `tmp:${clientMsgUuid}`, threadId, senderId: user?.id, type: 'text',
      body, clientMsgUuid, createdAt: new Date().toISOString(), status: 'sending',
    };
    get().mergeMessages(threadId, [optimistic]);
    await addOptimistic(threadId, optimistic);
    await enqueueOutbox({ clientMsgUuid, threadId, type: 'text', body });
    get().trySend(threadId, { clientMsgUuid, type: 'text', body });
  },

  sendMedia: async (threadId, { type, objectKey }) => {
    const user = useAuthStore.getState().user;
    const clientMsgUuid = genId();
    const optimistic = {
      id: `tmp:${clientMsgUuid}`, threadId, senderId: user?.id, type, objectKey,
      clientMsgUuid, createdAt: new Date().toISOString(), status: 'sending',
    };
    get().mergeMessages(threadId, [optimistic]);
    await addOptimistic(threadId, optimistic);
    await enqueueOutbox({ clientMsgUuid, threadId, type, objectKey });
    get().trySend(threadId, { clientMsgUuid, type, objectKey });
  },

  trySend: async (threadId, item) => {
    let msg;
    try {
      msg = await svc.sendMessage(threadId, {
        type: item.type, body: item.body, objectKey: item.objectKey, clientMsgUuid: item.clientMsgUuid,
      });
    } catch (e) {
      // Only an HTTP send rejection means "not sent".
      const ended = e?.response?.data?.code === 'THREAD_NOT_ACTIVE';
      await markFailed(item.clientMsgUuid).catch(() => {});
      await dequeueOutbox(item.clientMsgUuid).catch(() => {}); // don't retry hard failures
      get().setMsgStatus(threadId, `tmp:${item.clientMsgUuid}`, ended ? 'ended' : 'failed');
      return;
    }
    // Sent for sure — the local cache write is best-effort and must never flip to failed.
    try { await confirmOptimistic(threadId, item.clientMsgUuid, msg); } catch (_) {}
    await dequeueOutbox(item.clientMsgUuid).catch(() => {});
    set((st) => {
      const list = (st.messagesByThread[threadId] || []).filter((m) => m.id !== `tmp:${item.clientMsgUuid}`);
      return { messagesByThread: { ...st.messagesByThread, [threadId]: sortNewestFirst(dedupe([{ ...msg, status: 'sent' }, ...list])) } };
    });
  },

  retry: async (threadId, message) => {
    get().setMsgStatus(threadId, message.id, 'sending');
    get().trySend(threadId, {
      clientMsgUuid: message.clientMsgUuid, type: message.type, body: message.body, objectKey: message.objectKey,
    });
  },

  flushOutbox: async () => {
    const items = await getOutbox();
    for (const it of items) get().trySend(it.threadId, it);
  },

  setMsgStatus: (threadId, id, status) => {
    set((st) => ({
      messagesByThread: {
        ...st.messagesByThread,
        [threadId]: (st.messagesByThread[threadId] || []).map((m) => (m.id === id ? { ...m, status } : m)),
      },
    }));
  },

  setThreadMuted: (threadId, muted) => {
    set((st) => ({ threads: st.threads.map((t) => (t.id === threadId ? { ...t, muted } : t)) }));
  },
}));

function previewOf(m) {
  if (m.type === 'image') return '📷 Photo';
  if (m.type === 'pdf') return '📄 PDF';
  if (m.type === 'workout_card') return '🏋️ Workout';
  return (m.body || '').slice(0, 80);
}
