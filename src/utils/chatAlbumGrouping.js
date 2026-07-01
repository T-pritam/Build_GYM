/**
 * chatAlbumGrouping.js — collapses array-adjacent same-sender image messages
 * into one album grid, WhatsApp-style. Presentation only: each underlying
 * message keeps its own id/status, nothing changes server-side.
 *
 * Order-agnostic: works whether `messages` is newest-first (inverted chat
 * threads) or chronological (read-only transcript) — grouping only cares
 * about array adjacency, not chronological direction.
 */
export function groupAlbums(messages) {
  const out = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.type === 'image') {
      const run = [m];
      let j = i + 1;
      while (j < messages.length && messages[j].type === 'image' && messages[j].senderId === m.senderId) {
        run.push(messages[j]);
        j++;
      }
      if (run.length > 1) {
        out.push({ kind: 'album', id: `album:${run[0].id}`, images: run, senderId: m.senderId });
      } else {
        out.push({ kind: 'message', message: m });
      }
      i = j;
    } else {
      out.push({ kind: 'message', message: m });
      i++;
    }
  }
  return out;
}

/** The message used to represent a grouped item for day-divider/createdAt comparisons. */
export function representativeMessage(item) {
  return item.kind === 'album' ? item.images[0] : item.message;
}
