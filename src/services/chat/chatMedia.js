/**
 * chatMedia.js — pick + on-device compress + presigned direct-to-R2 upload.
 *
 * Image: compressed to ≤400KB via a discrete step-list retry (each attempt
 * re-manipulates from the ORIGINAL asset, never the previous output, to avoid
 * compounding quality loss) BEFORE upload, so the VPS never sees the bytes.
 * Gallery supports picking several images at once (camera stays single-shot).
 * PDF: size-checked (5MB cap), no compression — the server re-validates the
 * real size/type via HeadObject at confirm (sendMessage).
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { getInfoAsync, createUploadTask, FileSystemUploadType } from 'expo-file-system/legacy';

import { attachIntent } from './chatService';

// The size we compress images DOWN TO before uploading — a target, not a limit.
const IMAGE_COMPRESS_TARGET_BYTES = 400 * 1024;
// The hard upload caps the server also enforces (spec: 10MB inclusive, both types).
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const COMPRESS_STEPS = [
  { width: 2048, quality: 0.7 },
  { width: 1600, quality: 0.6 },
  { width: 1280, quality: 0.5 },
  { width: 1024, quality: 0.4 },
  { width: 800, quality: 0.35 },
];

async function compressOne(asset) {
  let best = null;
  for (const step of COMPRESS_STEPS) {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri, // always the ORIGINAL — never re-compress an already-compressed output
      [{ resize: { width: step.width } }],
      { compress: step.quality, format: ImageManipulator.SaveFormat.JPEG },
    );
    const info = await getInfoAsync(manipulated.uri);
    const size = info.size ?? 0;
    if (best === null || size < best.size) best = { uri: manipulated.uri, size };
    if (size <= IMAGE_COMPRESS_TARGET_BYTES) return { uri: manipulated.uri, mime: 'image/jpeg', size };
  }
  // Fell through every step — return the smallest attempt found.
  return { uri: best.uri, mime: 'image/jpeg', size: best.size };
}

/**
 * Pick from gallery (multi-select) or camera (single shot) and compress each.
 * Returns an array of { uri, mime, size } (empty/null if the user cancelled).
 */
export async function pickAndCompressImage(fromCamera = false) {
  const opts = { mediaTypes: ['images'], quality: 1, allowsEditing: fromCamera };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true });
  if (res.canceled || !res.assets?.length) return null;
  return Promise.all(res.assets.map(compressOne));
}

/** Pick a PDF. Returns { uri, mime, size, name } or null. */
export async function pickPdf() {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: 'application/pdf', size: a.size ?? 0, name: a.name };
}

/**
 * Upload a picked/compressed file to R2 via presigned PUT.
 * @returns { objectKey, type, fileName }  → pass to chatStore.sendMedia
 */
export async function uploadToR2(threadId, file, onProgress) {
  const isPdf = file.mime === 'application/pdf';
  const cap = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size && file.size > cap) {
    const err = new Error('File exceeds the 10 MB limit');
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }
  const kind = isPdf ? 'pdf' : 'image';
  const intent = await attachIntent(threadId, { mime: file.mime, size: file.size, kind });

  // createUploadTask (rather than uploadAsync) so the caller can render real
  // upload progress — without it the UI can only show an indeterminate spinner.
  const task = createUploadTask(
    intent.uploadUrl,
    file.uri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': file.mime },
    },
    (p) => {
      if (!onProgress || !p.totalBytesExpectedToSend) return;
      onProgress(Math.min(1, p.totalBytesSent / p.totalBytesExpectedToSend));
    },
  );
  const result = await task.uploadAsync();
  if (!result) throw new Error('Upload cancelled');
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status})`);
  }
  return { objectKey: intent.objectKey, type: intent.type, fileName: file.name || null };
}
