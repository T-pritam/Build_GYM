/**
 * progressService.js — B.2 Progress Tracker (body weight + progress photos).
 * Photos upload directly to R2 via a server-issued presigned PUT (mirrors chat).
 */
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import api from './apiService';
import { pickAndCompressImage } from './chat/chatMedia';

// ── Body weight ──────────────────────────────────────────────────────────────
export const fetchWeightLog = async (from, to) => {
  const { data } = await api.get('/member/progress/weight', { params: { from, to } });
  return data.data; // [{ id, date, weightKg }]
};

export const logWeight = async (weightKg, date) => {
  const { data } = await api.post('/member/progress/weight', { weightKg, date });
  return data.data;
};

export const updateWeight = async (id, weightKg) => {
  const { data } = await api.patch(`/member/progress/weight/${id}`, { weightKg });
  return data.data;
};

export const deleteWeight = async (id) => {
  await api.delete(`/member/progress/weight/${id}`);
};

// ── Progress photos ──────────────────────────────────────────────────────────
export const fetchProgressPhotos = async () => {
  const { data } = await api.get('/member/progress/photos');
  return data.data; // [{ id, label, uploadedAt, url, thumbnailUrl }]
};

/**
 * Pick (gallery/camera) → compress → presign → PUT to R2 → record the row.
 * @returns array of created photo records, or null if cancelled.
 */
export const addProgressPhotos = async (fromCamera = false, label = null) => {
  const files = await pickAndCompressImage(fromCamera);
  if (!files?.length) return null;
  const created = [];
  for (const file of files) {
    const { data: presign } = await api.post('/member/progress/photos/presign', {});
    const { uploadUrl, storagePath } = presign.data;
    const res = await uploadAsync(uploadUrl, file.uri, {
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': 'image/jpeg' },
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`Upload failed (${res.status})`);
    const { data } = await api.post('/member/progress/photos', { storagePath, label });
    created.push(data.data);
  }
  return created;
};

export const deleteProgressPhoto = async (id) => {
  await api.delete(`/member/progress/photos/${id}`);
};
