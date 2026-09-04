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
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import * as svc from '../services/chat/chatService';
import * as sock from '../services/chat/chatSocket';
import {
  initChatCache, cacheMessages, getCachedMessages, getLastServerId,
  addOptimistic, confirmOptimistic, markFailed,
  enqueueOutbox, dequeueOutbox, getOutbox, clearChatCache,
  cacheThreads, getCachedThreads,
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
  _appStateSub: null,
  _outboxTimer: null,

  unreadTotal: () => get().threads.reduce((s, t) => s + (t.unread || 0), 0),

  // ── bootstrap ───────────────────────────────────────────────────────────────
  init: async () => {
    await initChatCache();
    // Paint from cache first so a cold open offline still shows the real coach
    // rather than the "no coach assigned yet" empty state.
    if (!get().threads.length) {
      const cached = await getCachedThreads().catch(() => []);
      if (cached.length) set({ threads: cached });
    }
    get().wireSocket();
    await get().loadThreads();
    get().flushOutbox();
    get().ensureOutboxRetry();
  },

  loadThreads: async () => {
    try {
      const threads = await svc.listThreads();
      set({ threads });
      cacheThreads(threads).catch(() => {});
    } catch (e) { /* offline → whatever we painted from cache stands */ }
  },

  // ── socket wiring (once) ─────────────────────────────────────────────────────
  /**
   * Presence follows the OS app state, not just screen mount/unmount.
   * React Navigation keeps ChatThreadScreen mounted when the app is backgrounded,
   * so without this the server still believes the user is watching the thread —
   * it marks incoming messages read and suppresses their push.
   */
  wireAppState: () => {
    if (get()._appStateSub) return;
    const sub = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      const tid = get().openThreadId;
      if (!tid) return;
      sock.setForeground(active);
      if (active) { sock.reconnectIfNeeded(); get().flushOutbox(); }
      // Coming back to a thread that's on screen: catch up the read pointer now.
      if (active) get().markReadNewest(tid);
    });
    set({ _appStateSub: sub });
  },

  wireSocket: () => {
    if (get()._wired) return;
    get().wireAppState();
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
    // Nobody is signed in, or this event belongs to a thread we don't hold — a
    // stale socket from a previous session can still deliver here, and merging it
    // would leak the previous account's messages into this one.
    if (!me) return;
    // A thread we don't hold is either brand new (a mapping just created one) or
    // not ours at all. Re-fetch the list rather than trusting the event: if the
    // thread really is ours it reappears, and if it isn't we've dropped it.
    if (!get().threads.some((t) => t.id === m.threadId)) {
      await get().loadThreads();
      if (!get().threads.some((t) => t.id === m.threadId)) return;
    }
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
    // Never claim "read" while the app is backgrounded — the user isn't looking.
    if (AppState.currentState !== 'active') return;
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

  sendMedia: async (threadId, { type, objectKey, fileName }) => {
    const user = useAuthStore.getState().user;
    const clientMsgUuid = genId();
    const optimistic = {
      id: `tmp:${clientMsgUuid}`, threadId, senderId: user?.id, type, objectKey, fileName,
      clientMsgUuid, createdAt: new Date().toISOString(), status: 'sending',
    };
    get().mergeMessages(threadId, [optimistic]);
    await addOptimistic(threadId, optimistic);
    await enqueueOutbox({ clientMsgUuid, threadId, type, objectKey, fileName });
    get().trySend(threadId, { clientMsgUuid, type, objectKey, fileName });
  },

  trySend: async (threadId, item) => {
    let msg;
    try {
      msg = await svc.sendMessage(threadId, {
        type: item.type, body: item.body, objectKey: item.objectKey,
        clientMsgUuid: item.clientMsgUuid, fileName: item.fileName,
      });
    } catch (e) {
      // Only an HTTP send rejection means "not sent" — the server saw it and said
      // no, so retrying can't help. A transport failure (offline, DNS, timeout)
      // carries no `response`: that message MUST stay queued so flushOutbox can
      // resend it when connectivity returns.
      const rejected = !!e?.response;
      const ended = e?.response?.data?.code === 'THREAD_NOT_ACTIVE';
      await markFailed(item.clientMsgUuid).catch(() => {});
      if (rejected) await dequeueOutbox(item.clientMsgUuid).catch(() => {});
      else get().ensureOutboxRetry(); // still queued — keep trying until it lands
      // Still shown as "Not sent — tap to retry" either way, so the user keeps
      // manual agency; the difference is only whether flushOutbox will retry it.
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
      clientMsgUuid: message.clientMsgUuid, type: message.type, body: message.body,
      objectKey: message.objectKey, fileName: message.fileName,
    });
  },

  /**
   * Keep retrying the outbox until it drains.
   *
   * The socket's `connect` event alone is not a dependable trigger: if the app
   * was launched with no network, socket.io can stop retrying on its own, so a
   * returning connection never fires `connect` and queued messages sit there
   * forever. This ticks until the queue is empty, nudging the socket back up as
   * it goes. Offline queueing is specified as mandatory, not best-effort.
   */
  ensureOutboxRetry: () => {
    if (get()._outboxTimer) return;
    const id = setInterval(async () => {
      const items = await getOutbox().catch(() => []);
      if (!items.length) {
        clearInterval(get()._outboxTimer);
        set({ _outboxTimer: null });
        return;
      }
      sock.reconnectIfNeeded();
      get().flushOutbox();
    }, 15000);
    set({ _outboxTimer: id });
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

  /**
   * Tear everything down on logout: drop the socket (it stays authenticated as
   * the outgoing user otherwise), wipe in-memory state and empty the on-device
   * cache. Without this the next account on the same handset inherits the
   * previous user's threads, messages and read pointers.
   */
  reset: async () => {
    sock.disconnectChatSocket();
    get()._appStateSub?.remove?.();
    if (get()._outboxTimer) clearInterval(get()._outboxTimer);
    set({
      threads: [], messagesByThread: {}, readsByThread: {},
      openThreadId: null, _wired: false, _appStateSub: null, _outboxTimer: null,
    });
    await clearChatCache().catch(() => {});
  },
}));

function previewOf(m) {
  if (m.type === 'image') return '📷 Photo';
  if (m.type === 'pdf') return '📄 PDF';
  if (m.type === 'workout_card') return '🏋️ Workout';
  return (m.body || '').slice(0, 80);
}
