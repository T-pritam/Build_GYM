/**
 * AttachmentPreview — confirm-before-send sheet for picked images / PDFs.
 *
 * Picking used to send immediately: choose a photo and it was in the thread
 * before you could look at it, so a mis-tap was unrecoverable (messages are
 * immutable — there is no delete). This puts a deliberate Send between the
 * picker and the thread, and shows real upload progress once sending starts.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

const prettySize = (bytes) => {
  if (!bytes) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function AttachmentPreview({ visible, files, sending, progress, onCancel, onSend, onRemove }) {
  const count = files?.length || 0;
  if (!visible || !count) return null;
  const isPdf = files[0].mime === 'application/pdf';
  const pct = Math.round((progress || 0) * 100);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={sending ? undefined : onCancel}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.title}>
            {isPdf ? 'Send document' : count > 1 ? `Send ${count} photos` : 'Send photo'}
          </Text>

          {isPdf ? (
            <View style={s.pdfRow}>
              <Ionicons name="document-text" size={28} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.pdfName} numberOfLines={2}>{files[0].name || 'Document.pdf'}</Text>
                <Text style={s.pdfMeta}>{prettySize(files[0].size)}</Text>
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
              {files.map((f, i) => (
                <View key={f.uri} style={s.thumbWrap}>
                  <Image source={{ uri: f.uri }} style={s.thumb} />
                  {!sending && count > 1 ? (
                    <TouchableOpacity style={s.remove} onPress={() => onRemove(i)}>
                      <Ionicons name="close" size={13} color={COLORS.black} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}

          {sending ? (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={s.progressTxt}>Uploading… {pct}%</Text>
            </View>
          ) : (
            <View style={s.actions}>
              <TouchableOpacity style={[s.btn, s.cancel]} onPress={onCancel}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.send]} onPress={onSend}>
                <Ionicons name="send" size={15} color={COLORS.black} />
                <Text style={s.sendTxt}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 30 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, marginBottom: 14 },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  thumbRow: { gap: 10, paddingVertical: 2 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: COLORS.surface3 },
  remove: {
    position: 'absolute', top: -5, right: -5, width: 21, height: 21, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  pdfRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface3, borderRadius: 12, padding: 14 },
  pdfName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  pdfMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  progressWrap: { marginTop: 18 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.surface3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  progressTxt: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12 },
  cancel: { borderWidth: 1, borderColor: COLORS.border },
  cancelTxt: { color: COLORS.textPrimary, fontWeight: '700' },
  send: { backgroundColor: COLORS.primary },
  sendTxt: { color: COLORS.black, fontWeight: '800' },
});
