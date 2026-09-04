/**
 * ChatThreadScreen — the member's conversation with their coach.
 * Inverted FlatList (newest at bottom), optimistic send + ticks, day dividers,
 * one-time disclosure banner, attach (camera/gallery/pdf) with on-device compress
 * + presigned upload, workout cards (live pointer), and long-press Copy/Report.
 * Immutable: long-press offers only Copy + Report (no edit/delete).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Linking, Modal, FlatList, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import dayjs from 'dayjs';

import { COLORS } from '../../theme/colors';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import * as svc from '../../services/chat/chatService';
import { setForeground } from '../../services/chat/chatSocket';
import { pickAndCompressImage, pickPdf, uploadToR2 } from '../../services/chat/chatMedia';
import { getOrFetch } from '../../services/chat/chatMediaUrlCache';
import { groupAlbums, representativeMessage } from '../../utils/chatAlbumGrouping';
import ChatImageThumb from '../../components/chat/ChatImageThumb';
import MediaAlbumGrid from '../../components/chat/MediaAlbumGrid';
import MediaAlbumViewer from '../../components/chat/MediaAlbumViewer';
import PdfBubble from '../../components/chat/PdfBubble';
import AttachmentPreview from '../../components/chat/AttachmentPreview';
import { RECEPTION_PHONE } from '../../services/notificationService';

const MAX_LEN = 2000;

export default function ChatThreadScreen({ route, navigation }) {
  const { threadId } = route.params;
  const me = useAuthStore((s) => s.user?.id);

  const messages = useChatStore((s) => s.messagesByThread[threadId]) || [];
  const reads = useChatStore((s) => s.readsByThread[threadId]) || {};
  const thread = useChatStore((s) => s.threads.find((t) => t.id === threadId));
  const openThread = useChatStore((s) => s.openThread);
  const closeThread = useChatStore((s) => s.closeThread);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const sendText = useChatStore((s) => s.sendText);
  const sendMedia = useChatStore((s) => s.sendMedia);
  const retry = useChatStore((s) => s.retry);
  const setThreadMuted = useChatStore((s) => s.setThreadMuted);

  const coachId = thread?.trainerId || thread?.counterpartId || route.params.coachId;
  const coachName = thread?.counterpartName || route.params.coachName || 'Your Coach';
  const coachPhoto = thread?.counterpartPhoto || route.params.coachPhoto || null;
  const state = thread?.state || route.params.state || 'active';

  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [text, setText] = useState('');
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showMute, setShowMute] = useState(false);
  const [albumViewer, setAlbumViewer] = useState(null); // { images, initialIndex } | null
  const [pending, setPending] = useState([]);            // picked files awaiting an explicit Send
  const [uploadPct, setUploadPct] = useState(0);

  useEffect(() => {
    openThread(threadId);
    setForeground(true);
    svc.getDisclosure().then((acked) => setShowDisclosure(!acked)).catch(() => {});
    return () => { closeThread(threadId); setForeground(false); };
  }, [threadId]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages[0]?.id]);

  const ackDisclosure = useCallback(() => {
    setShowDisclosure(false);
    svc.ackDisclosure().catch(() => {});
  }, []);

  const onSend = () => {
    const t = text.trim();
    if (!t) return;
    sendText(threadId, t);
    setText('');
  };

  const onAttach = () => setShowPicker(true);

  // Picking only STAGES the files — nothing reaches the thread until Send is
  // pressed. Messages are immutable, so an accidental send can't be undone.
  const doImage = async (fromCamera) => {
    try {
      const files = await pickAndCompressImage(fromCamera);
      if (!files || !files.length) return;
      setPending(files);
    } catch (e) { Alert.alert('Could not attach', e.message || 'Please try again'); }
  };
  const doPdf = async () => {
    try {
      const file = await pickPdf();
      if (!file) return;
      setPending([file]);
    } catch (e) { Alert.alert('Could not attach', e.message || 'Please try again'); }
  };

  const sendPending = async () => {
    const files = pending;
    setUploading(true);
    setUploadPct(0);
    try {
      for (let i = 0; i < files.length; i += 1) { // sequential: preserves pick order, kinder to a poor connection
        const file = files[i];
        try {
          const { objectKey, type, fileName } = await uploadToR2(threadId, file, (f) => {
            // Spread each file's progress across the whole batch.
            setUploadPct((i + f) / files.length);
          });
          await sendMedia(threadId, { type, objectKey, fileName });
        } catch (e) { /* this file's optimistic row already shows its own failed/retry state */ }
      }
    } finally {
      setUploading(false);
      setUploadPct(0);
      setPending([]);
    }
  };

  const onLongPress = (m) => {
    // System lines and workout cards aren't authored by a person — nothing to
    // copy and nobody to report. Everything else (text, image, PDF) is fair game.
    if (m.type === 'system' || m.type === 'workout_card') return;
    const own = m.senderId && m.senderId === me;
    const actions = [];
    if (m.type === 'text') {
      actions.push({ text: 'Copy text', onPress: () => Clipboard.setStringAsync(m.body || '') });
    }
    // Reporting your own message does nothing useful and just floods the queue.
    if (!own) {
      actions.push({ text: 'Report', style: 'destructive', onPress: () => reportMsg(m) });
    }
    actions.push({ text: 'Cancel', style: 'cancel' });
    if (actions.length === 1) return; // nothing on offer but Cancel
    Alert.alert('Message', undefined, actions);
  };
  const reportMsg = (m) => {
    svc.reportMessage(m.id, 'Reported from chat')
      .then(() => Alert.alert('Reported', 'Thanks — our team will review this.'))
      .catch(() => Alert.alert('Could not report', 'Please try again later.'));
  };

  const onMute = () => {
    if (thread?.muted) {
      svc.unmuteThread(threadId).then(() => setThreadMuted(threadId, false)).catch(() => {});
      return;
    }
    setShowMute(true);
  };
  const mute = (d) => svc.muteThread(threadId, d).then(() => setThreadMuted(threadId, true)).catch(() => {});

  // Build divider flags (first message of each calendar day, chronologically).
  const tickFor = useCallback((m) => {
    if (m.senderId !== me) return null;
    if (m.status === 'sending') return { icon: 'time-outline', color: COLORS.textMuted };
    if (m.status === 'failed') return { failed: true };
    if (m.status === 'ended') return { ended: true };
    const r = reads[coachId] || {};
    if (r.lastReadMessageId && m.id <= r.lastReadMessageId) return { icon: 'checkmark-done', color: COLORS.cyan };
    if (r.lastDeliveredMessageId && m.id <= r.lastDeliveredMessageId) return { icon: 'checkmark-done', color: COLORS.textMuted };
    return { icon: 'checkmark', color: COLORS.textMuted };
  }, [me, reads, coachId]);

  const grouped = useMemo(() => groupAlbums(messages), [messages]);

  const renderItem = ({ item, index }) => {
    const older = grouped[index + 1]; // inverted: next index is older
    const rep = representativeMessage(item);
    const showDivider = !older || dayKey(representativeMessage(older).createdAt) !== dayKey(rep.createdAt);
    if (item.kind === 'album') {
      const lastTile = item.images[Math.min(item.images.length, 4) - 1];
      return (
        <View>
          {showDivider ? <DayDivider date={rep.createdAt} /> : null}
          <View style={[styles.bubbleRow, { justifyContent: item.senderId === me ? 'flex-end' : 'flex-start' }]}>
            <MediaAlbumGrid threadId={threadId} images={item.images} getMedia={svc.getMedia}
              onOpenAt={(idx) => setAlbumViewer({ images: item.images, initialIndex: idx })}
              onLongPress={() => onLongPress(item.images[0])}
              lastTileTimeLabel={dayjs(lastTile.createdAt).format('HH:mm')} lastTileTick={tickFor(lastTile)} />
          </View>
        </View>
      );
    }
    const m = item.message;
    return (
      <View>
        {showDivider ? <DayDivider date={rep.createdAt} /> : null}
        <MessageRow m={m} mine={m.senderId === me} tick={tickFor(m)} threadId={threadId} getMedia={svc.getMedia}
          onLongPress={() => onLongPress(m)} onRetry={() => retry(threadId, m)}
          onOpenMedia={() => openMedia(threadId, m)} navigation={navigation} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <Header
        navigation={navigation} coachId={coachId} coachName={coachName} coachPhoto={coachPhoto}
        muted={thread?.muted} state={state} onMute={onMute} topInset={insets.top}
      />
      {showDisclosure ? <DisclosureBanner onAck={ackDisclosure} /> : null}

      <AttachmentPreview
        visible={pending.length > 0}
        files={pending}
        sending={uploading}
        progress={uploadPct}
        onCancel={() => setPending([])}
        onRemove={(i) => setPending((cur) => cur.filter((_, idx) => idx !== i))}
        onSend={sendPending}
      />

      {messages.length === 0 ? (
        <View style={styles.emptyThread}>
          {/* Coach intro card above the placeholder, so a brand-new thread
              introduces the coach instead of opening on a bare screen. */}
          {coachPhoto
            ? <Image source={{ uri: coachPhoto }} style={styles.emptyAvatar} />
            : <View style={[styles.emptyAvatar, styles.emptyAvatarFallback]}>
                <Text style={styles.emptyAvatarLetter}>{(coachName || 'C').charAt(0).toUpperCase()}</Text>
              </View>}
          <Text style={styles.emptyName}>{coachName}</Text>
          {thread?.counterpartSpecialisation
            ? <Text style={styles.emptySpec}>{thread.counterpartSpecialisation}</Text>
            : <Text style={styles.emptySpec}>Your personal trainer</Text>}
          <Text style={styles.emptyHi}>Say hi to your coach 👋</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          inverted
          data={grouped}
          keyExtractor={(g) => (g.kind === 'album' ? g.id : g.message.id)}
          renderItem={renderItem}
          onEndReached={() => loadOlder(threadId)}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

      <InputBar
        state={state} text={text} setText={setText} onSend={onSend}
        onAttach={onAttach} uploading={uploading} bottomInset={insets.bottom}
      />
      <ChatAttachPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onCamera={() => doImage(true)}
        onGallery={() => doImage(false)}
        onPdf={doPdf}
      />
      <MuteSheet visible={showMute} onClose={() => setShowMute(false)} onPick={mute} />
      <MediaAlbumViewer
        threadId={threadId} getMedia={svc.getMedia}
        images={albumViewer?.images || null} initialIndex={albumViewer?.initialIndex || 0}
        onClose={() => setAlbumViewer(null)}
      />
    </KeyboardAvoidingView>
  );

  function openMedia(tid, m) {
    if (!m.objectKey) return;
    if (m.type === 'image') { setAlbumViewer({ images: [m], initialIndex: 0 }); return; }
    getOrFetch(tid, m.id, svc.getMedia)
      .then(({ url }) => WebBrowser.openBrowserAsync(url))
      .catch(() => Alert.alert('Could not open file'));
  }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────
function Header({ navigation, coachId, coachName, coachPhoto, muted, state, onMute, topInset = 0 }) {
  const tag = state === 'frozen' ? '🔒 Paused' : state === 'archived' ? 'Past coach' : 'Coach';
  return (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
      <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} style={styles.hBtn}>
        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.hTitle} onPress={() => coachId && navigation.navigate('TrainerDetail', { trainerId: coachId })}>
        {coachPhoto
          ? <Image source={{ uri: coachPhoto }} style={styles.hAvatar} />
          : <View style={styles.hAvatar}>
              <Text style={styles.hAvatarLetter}>{(coachName || 'C').charAt(0).toUpperCase()}</Text>
            </View>}
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.hName} numberOfLines={1}>{coachName}</Text>
          <Text style={styles.hTag}>{tag}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onMute} style={styles.hBtn}>
        <Ionicons name={muted ? 'notifications-off' : 'notifications-outline'} size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function DisclosureBanner({ onAck }) {
  return (
    <View style={styles.disclosure}>
      <Text style={styles.disclosureTxt}>
        Messages here may be reviewed by BuildGym management for safety and compliance.
      </Text>
      <TouchableOpacity onPress={onAck} style={styles.disclosureBtn}><Text style={styles.disclosureBtnTxt}>Got it</Text></TouchableOpacity>
    </View>
  );
}

function DayDivider({ date }) {
  const d = dayjs(date);
  const label = d.isSame(dayjs(), 'day') ? 'Today'
    : d.isSame(dayjs().subtract(1, 'day'), 'day') ? 'Yesterday'
    : d.format('D MMM YYYY');
  return <View style={styles.divider}><Text style={styles.dividerTxt}>{label}</Text></View>;
}

function MessageRow({ m, mine, tick, onLongPress, onRetry, onOpenMedia, navigation, threadId, getMedia }) {
  if (m.type === 'system') {
    return <View style={styles.sysWrap}><Text style={styles.sysTxt}>{m.body}</Text></View>;
  }
  if (m.type === 'workout_card') {
    return (
      <TouchableOpacity style={styles.card} onPress={() => m.workoutLogId && navigation.navigate('WorkoutAssignmentOverview', { workoutId: m.workoutLogId })}>
        <Ionicons name="barbell" size={20} color={COLORS.primaryLight} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>{m.body || 'Workout'}</Text>
          <Text style={styles.cardLink}>View workout →</Text>
        </View>
      </TouchableOpacity>
    );
  }
  const isMedia = m.type === 'image' || m.type === 'pdf';
  return (
    <TouchableOpacity activeOpacity={0.8} onLongPress={onLongPress}
      style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, isMedia && styles.bubbleMedia]}>
        {m.type === 'image' ? (
          <ChatImageThumb threadId={threadId} messageId={m.id} getMedia={getMedia} style={styles.singleImageThumb} onPress={onOpenMedia}
            onLongPress={onLongPress} timeLabel={dayjs(m.createdAt).format('HH:mm')} tick={tick} />
        ) : m.type === 'pdf' ? (
          <PdfBubble threadId={threadId} message={m} getMedia={getMedia} onPress={onOpenMedia} onLongPress={onLongPress} />
        ) : (
          <Text style={styles.bubbleTxt}>{m.body}</Text>
        )}
        {m.type === 'image' ? (
          tick?.failed ? (
            <View style={[styles.metaRow, styles.mediaMetaRow]}>
              <TouchableOpacity onPress={onRetry}><Text style={styles.failed}>Not sent — tap to retry</Text></TouchableOpacity>
            </View>
          ) : tick?.ended ? (
            <View style={[styles.metaRow, styles.mediaMetaRow]}>
              <Text style={styles.failed}>Not sent — coaching ended</Text>
            </View>
          ) : null
        ) : (
          <View style={[styles.metaRow, isMedia && styles.mediaMetaRow]}>
            <Text style={styles.metaTime}>{dayjs(m.createdAt).format('HH:mm')}</Text>
            {tick ? (
              tick.failed ? (
                <TouchableOpacity onPress={onRetry}><Text style={styles.failed}>Not sent — tap to retry</Text></TouchableOpacity>
              ) : tick.ended ? (
                <Text style={styles.failed}>Not sent — coaching ended</Text>
              ) : (
                <Ionicons name={tick.icon} size={14} color={tick.color} style={{ marginLeft: 4 }} />
              )
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function InputBar({ state, text, setText, onSend, onAttach, uploading, bottomInset = 0 }) {
  if (state === 'archived') {
    return <View style={[styles.lockBar, { paddingBottom: bottomInset + 14 }]}><Text style={styles.lockTxt}>This coaching has ended. Messages are kept for your records.</Text></View>;
  }
  if (state === 'frozen') {
    return (
      <View style={[styles.lockBar, { paddingBottom: bottomInset + 14 }]}>
        <Text style={styles.lockTxt}>Chat paused by gym management — </Text>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}><Text style={styles.lockLink}>contact the front desk</Text></TouchableOpacity>
      </View>
    );
  }
  return (
    <View>
      {text.length >= 1800 ? <Text style={styles.counter}>{text.length}/{MAX_LEN}</Text> : null}
      <View style={[styles.inputBar, { paddingBottom: bottomInset + 8 }]}>
        <TouchableOpacity onPress={onAttach} style={styles.attachBtn} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={COLORS.primaryLight} /> : <Ionicons name="add" size={26} color={COLORS.primaryLight} />}
        </TouchableOpacity>
        <TextInput
          style={styles.input} value={text} onChangeText={(t) => setText(t.slice(0, MAX_LEN))}
          placeholder="Message your coach…" placeholderTextColor={COLORS.textMuted} multiline maxLength={MAX_LEN}
        />
        <TouchableOpacity onPress={onSend} style={styles.sendBtn} disabled={!text.trim()}>
          <Ionicons name="send" size={20} color={text.trim() ? COLORS.black : COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const dayKey = (iso) => dayjs(iso).format('YYYY-MM-DD');

// ─── Attach picker (WhatsApp-style bottom sheet) ──────────────────────────────
function ChatAttachPicker({ visible, onClose, onCamera, onGallery, onPdf }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <View style={pickerStyles.grid}>
            <PickerOption icon="camera-outline" label="Camera" color="#4CAF50" onPress={() => { onClose(); onCamera(); }} />
            <PickerOption icon="images-outline" label="Gallery" color="#2196F3" onPress={() => { onClose(); onGallery(); }} />
            <PickerOption icon="document-text-outline" label="Document" color="#9C27B0" onPress={() => { onClose(); onPdf(); }} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function PickerOption({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={pickerStyles.option} onPress={onPress}>
      <View style={[pickerStyles.iconBg, { backgroundColor: color }]}>
        <Ionicons name={icon} size={26} color="#fff" />
      </View>
      <Text style={[pickerStyles.label, { color: COLORS.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, paddingHorizontal: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginBottom: 20 },
  grid: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' },
  option: { alignItems: 'center', gap: 8, marginBottom: 8, minWidth: 70 },
  iconBg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12 },
});

// ─── Mute notifications bottom sheet ──────────────────────────────────────────
function MuteSheet({ visible, onClose, onPick }) {
  const opts = [
    { d: '8h', icon: 'time-outline', label: 'For 8 hours' },
    { d: '1w', icon: 'calendar-outline', label: 'For 1 week' },
    { d: 'forever', icon: 'infinite-outline', label: 'Until I turn it back on' },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={muteStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={muteStyles.sheet}>
          <View style={muteStyles.handle} />
          <Text style={muteStyles.title}>Mute notifications</Text>
          {opts.map((o, i) => (
            <TouchableOpacity
              key={o.d}
              style={[muteStyles.row, i < opts.length - 1 && muteStyles.rowDivider]}
              onPress={() => { onClose(); onPick(o.d); }}
            >
              <Ionicons name={o.icon} size={20} color={COLORS.primaryLight} style={{ marginRight: 14 }} />
              <Text style={muteStyles.rowTxt}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const muteStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginBottom: 14 },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowTxt: { color: COLORS.textPrimary, fontSize: 15 },
});


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  hBtn: { padding: 6 },
  hTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  hAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  hAvatarLetter: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  emptyAvatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  emptyAvatarFallback: { backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center' },
  emptyAvatarLetter: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800' },
  emptyName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptySpec: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2, marginBottom: 14 },
  hName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  hTag: { color: COLORS.primaryLight, fontSize: 11 },
  disclosure: { backgroundColor: COLORS.primarySoft, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  disclosureTxt: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  disclosureBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  disclosureBtnTxt: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  emptyThread: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyHi: { color: COLORS.textMuted, fontSize: 15 },
  divider: { alignItems: 'center', marginVertical: 10 },
  dividerTxt: { color: COLORS.textMuted, fontSize: 11, backgroundColor: COLORS.surface2, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  sysWrap: { alignItems: 'center', marginVertical: 8 },
  sysTxt: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', backgroundColor: COLORS.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.primaryBorder, borderRadius: 14, padding: 12, marginVertical: 6 },
  cardTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  cardLink: { color: COLORS.primaryLight, fontSize: 12, marginTop: 2 },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.surface2, borderBottomLeftRadius: 4 },
  bubbleTxt: { color: COLORS.textPrimary, fontSize: 15 },
  bubbleMedia: { padding: 4 },
  singleImageThumb: { width: 220, height: 220, borderRadius: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  mediaMetaRow: { paddingHorizontal: 4 },
  metaTime: { color: COLORS.textMuted, fontSize: 10 },
  failed: { color: COLORS.errorBright, fontSize: 11, marginLeft: 6 },
  lockBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  lockTxt: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  lockLink: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '700' },
  counter: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', paddingRight: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  attachBtn: { padding: 6 },
  input: { flex: 1, maxHeight: 110, color: COLORS.textPrimary, backgroundColor: COLORS.backgroundAlt, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15 },
  sendBtn: { backgroundColor: COLORS.primary, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
