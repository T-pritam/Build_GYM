/**
 * chatCache.js — on-device message cache (expo-sqlite).
 *
 * WhatsApp-style instant cold-open (requirement #1): on thread open we render
 * cached rows immediately, then delta-sync `?after=<lastCachedId>` in the
 * background and merge. Also holds the offline OUTBOX so unsent messages survive
 * an app kill and auto-retry when connectivity returns (spec §5, gym dead zones).
 *
 * Message ids are server UUIDv7 → text-sortable in chronological order. Optimistic
 * (unsent) messages use a temporary id `tmp:<clientMsgUuid>` until the server id
 * arrives, at which point the temp row is replaced.
 */
import * as SQLite from 'expo-sqlite';

let _dbPromise = null;
function getDb() {
  if (!_dbPromise) _dbPromise = SQLite.openDatabaseAsync('buildgym_chat.db');
  return _dbPromise;
}

export async function initChatCache() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      thread_id       TEXT NOT NULL,
      sender_id       TEXT,
      type            TEXT NOT NULL,
      body            TEXT,
      object_key      TEXT,
      media_mime      TEXT,
      media_size      INTEGER,
      workout_log_id  TEXT,
      system_event    TEXT,
      client_msg_uuid TEXT,
      created_at      TEXT,
      status          TEXT DEFAULT 'sent'
    );
    CREATE INDEX IF NOT EXISTS idx_msg_thread ON messages (thread_id, created_at);
    CREATE TABLE IF NOT EXISTS outbox (
      client_msg_uuid TEXT PRIMARY KEY,
      thread_id       TEXT NOT NULL,
      type            TEXT NOT NULL,
      body            TEXT,
      object_key      TEXT,
      local_uri       TEXT,
      created_at      TEXT
    );
  `);
}

/** Upsert a batch of server messages into the cache. */
export async function cacheMessages(threadId, messages = []) {
  if (!messages.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const m of messages) {
      await db.runAsync(
        `INSERT OR REPLACE INTO messages
         (id, thread_id, sender_id, type, body, object_key, media_mime, media_size, workout_log_id, system_event, client_msg_uuid, created_at, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [m.id, threadId, m.senderId ?? null, m.type, m.body ?? null, m.objectKey ?? null,
         m.mediaMime ?? null, m.mediaSize ?? null, m.workoutLogId ?? null, m.systemEvent ?? null,
         m.clientMsgUuid ?? null, m.createdAt ?? new Date().toISOString(), m.status ?? 'sent'],
      );
    }
  });
}

/** Newest-first cached messages for a thread (for the inverted list). */
export async function getCachedMessages(threadId, limit = 50) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [threadId, limit],
  );
  return rows.map(rowToMessage);
}

/** Highest server id we hold for a thread → the `?after=` delta cursor. */
export async function getLastServerId(threadId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT id FROM messages WHERE thread_id = ? AND id NOT LIKE 'tmp:%' ORDER BY id DESC LIMIT 1`,
    [threadId],
  );
  return row?.id ?? null;
}

/** Insert an optimistic (sending) message with a temp id. */
export async function addOptimistic(threadId, msg) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO messages
     (id, thread_id, sender_id, type, body, object_key, media_mime, media_size, client_msg_uuid, created_at, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [`tmp:${msg.clientMsgUuid}`, threadId, msg.senderId ?? null, msg.type, msg.body ?? null,
     msg.objectKey ?? null, msg.mediaMime ?? null, msg.mediaSize ?? null,
     msg.clientMsgUuid, msg.createdAt ?? new Date().toISOString(), 'sending'],
  );
}

/** Replace a temp optimistic row with the confirmed server message. */
export async function confirmOptimistic(threadId, clientMsgUuid, serverMsg) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM messages WHERE id = ?`, [`tmp:${clientMsgUuid}`]);
    await db.runAsync(
      `INSERT OR REPLACE INTO messages
       (id, thread_id, sender_id, type, body, object_key, media_mime, media_size, workout_log_id, system_event, client_msg_uuid, created_at, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [serverMsg.id, threadId, serverMsg.senderId ?? null, serverMsg.type, serverMsg.body ?? null,
       serverMsg.objectKey ?? null, serverMsg.mediaMime ?? null, serverMsg.mediaSize ?? null,
       serverMsg.workoutLogId ?? null, serverMsg.systemEvent ?? null, clientMsgUuid,
       serverMsg.createdAt, 'sent'],
    );
  });
}

export async function markFailed(clientMsgUuid) {
  const db = await getDb();
  await db.runAsync(`UPDATE messages SET status = 'failed' WHERE id = ?`, [`tmp:${clientMsgUuid}`]);
}

// ─── Offline outbox ───────────────────────────────────────────────────────────
export async function enqueueOutbox(item) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO outbox (client_msg_uuid, thread_id, type, body, object_key, local_uri, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [item.clientMsgUuid, item.threadId, item.type, item.body ?? null, item.objectKey ?? null,
     item.localUri ?? null, item.createdAt ?? new Date().toISOString()],
  );
}
export async function dequeueOutbox(clientMsgUuid) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM outbox WHERE client_msg_uuid = ?`, [clientMsgUuid]);
}
export async function getOutbox(threadId = null) {
  const db = await getDb();
  const rows = threadId
    ? await db.getAllAsync(`SELECT * FROM outbox WHERE thread_id = ? ORDER BY created_at ASC`, [threadId])
    : await db.getAllAsync(`SELECT * FROM outbox ORDER BY created_at ASC`);
  return rows.map((r) => ({
    clientMsgUuid: r.client_msg_uuid, threadId: r.thread_id, type: r.type,
    body: r.body, objectKey: r.object_key, localUri: r.local_uri, createdAt: r.created_at,
  }));
}

function rowToMessage(r) {
  return {
    id: r.id, threadId: r.thread_id, senderId: r.sender_id, type: r.type, body: r.body,
    objectKey: r.object_key, mediaMime: r.media_mime, mediaSize: r.media_size,
    workoutLogId: r.workout_log_id, systemEvent: r.system_event, clientMsgUuid: r.client_msg_uuid,
    createdAt: r.created_at, status: r.status,
  };
}
