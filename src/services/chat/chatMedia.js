/**
 * chatMedia.js — pick + on-device compress + presigned direct-to-R2 upload.
 *
 * Image: compressed to ≤2048px JPEG q0.7 (HEIC→JPEG handled by the manipulator)
 * BEFORE upload, so the VPS never sees the bytes. PDF: size-checked, no compress.
 * The server re-validates the real size/type via HeadObject at confirm (sendMessage).
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { getInfoAsync, uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';

import { attachIntent } from './chatService';

const MAX_BYTES = 10 * 1024 * 1024;

/** Pick from gallery (or camera) and compress. Returns { uri, mime, size } or null. */
export async function pickAndCompressImage(fromCamera = false) {
  const opts = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;

  const asset = res.assets[0];
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 2048 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  const info = await getInfoAsync(manipulated.uri);
  return { uri: manipulated.uri, mime: 'image/jpeg', size: info.size ?? 0 };
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
 * @returns { objectKey, type }  → pass to chatStore.sendMedia
 */
export async function uploadToR2(threadId, file) {
  if (file.size && file.size > MAX_BYTES) {
    const err = new Error('File exceeds the 10 MB limit');
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }
  const kind = file.mime === 'application/pdf' ? 'pdf' : 'image';
  const intent = await attachIntent(threadId, { mime: file.mime, size: file.size, kind });

  const result = await uploadAsync(intent.uploadUrl, file.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': file.mime },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status})`);
  }
  return { objectKey: intent.objectKey, type: intent.type };
}
