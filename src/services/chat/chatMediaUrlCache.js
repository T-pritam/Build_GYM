/**
 * chatMediaUrlCache.js — in-memory cache of presigned R2 GET URLs for chat media.
 *
 * getMedia() is otherwise a network round-trip per call; since inline previews
 * (grid tiles, pdf thumbnails, the album viewer) can all want the same message's
 * URL, this de-dupes fetches and caches the result for a few minutes — comfortably
 * under the backend's 5-minute presign expiry (see BuildGymBackend/src/config/r2.js).
 */
const TTL_MS = 4 * 60 * 1000;

const cache = new Map(); // `${threadId}:${messageId}` -> { entry, fetchedAt }

function key(threadId, messageId) {
  return `${threadId}:${messageId}`;
}

/**
 * @param {string} threadId
 * @param {string} messageId
 * @param {(threadId: string, messageId: string) => Promise<{url,thumbnailUrl,fileName,mime,size}>} getMedia
 */
export async function getOrFetch(threadId, messageId, getMedia) {
  const k = key(threadId, messageId);
  const cached = cache.get(k);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.entry;
  const entry = await getMedia(threadId, messageId);
  cache.set(k, { entry, fetchedAt: Date.now() });
  return entry;
}

export function invalidate(threadId, messageId) {
  cache.delete(key(threadId, messageId));
}
