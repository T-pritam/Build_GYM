import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchAnnouncements, markAnnouncementRead } from '../../services/announcementService';
import { useAnnouncementStore } from '../../store/announcementStore';
import SafeBottomBar from '../../components/SafeBottomBar';

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_LABEL = {
  general:     'General',
  event:       'Event',
  maintenance: 'Maintenance',
  promotion:   'Promotion',
  health:      'Health',
};
const TYPE_COLOR = {
  event:       '#3B82F6',
  maintenance: '#EF4444',
  general:     '#64748B',
  promotion:   '#EAB308',
  health:      '#22C55E',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── TypeTag ─────────────────────────────────────────────────────────────────
function TypeTag({ type }) {
  const color = TYPE_COLOR[type] ?? '#64748B';
  const label = TYPE_LABEL[type] ?? type;
  return (
    <View style={[tt.tag, { borderColor: color + '60', backgroundColor: color + '20' }]}>
      <Text style={[tt.tagText, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}
const tt = StyleSheet.create({
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
});

// ─── Card ─────────────────────────────────────────────────────────────────────
function AnnouncementCard({ item, onPress, showPin }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.card, showPin && { borderColor: COLORS.secondary + '50' }, !item.is_read && s.cardUnread]}
    >
      <View style={s.cardTop}>
        <TypeTag type={item.type} />
        {showPin && <Text style={s.pinIcon}>📌</Text>}
        {item.urgent && <View style={s.urgentDot} />}
        {!item.is_read && <View style={s.unreadDot} />}
      </View>
      <Text style={s.cardTitle}>{item.title}</Text>
      <Text style={s.cardDesc} numberOfLines={2}>{item.message}</Text>
      <View style={s.cardFooter}>
        <Text style={s.footerText}>{formatDate(item.publishedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [error, setError]           = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const { unreadCount, refreshUnreadCount, markOneRead, clearUnread } =
    useAnnouncementStore();

  const loadingRef = useRef(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async (replace = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setError(null);
      const res = await fetchAnnouncements({ limit: 50 });
      setItems(replace ? (res.data ?? []) : (prev) => [...prev, ...(res.data ?? [])]);
      setNextCursor(res.nextCursor ?? null);
    } catch {
      setError('Failed to load announcements.');
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([loadItems(true), refreshUnreadCount()]).finally(() => setLoading(false));
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadItems(true), refreshUnreadCount()]);
    setRefreshing(false);
  };

  // ── Open / close detail modal ─────────────────────────────────────────────
  const handleOpen = (item) => {
    setSelected(item);
    if (!item.is_read) {
      markAnnouncementRead(item.id).catch(() => {});
      markOneRead();
      setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, is_read: true } : a));
    }
  };

  const handleClose = () => setSelected(null);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const handleMarkAllRead = () => {
    items.filter((a) => !a.is_read).forEach((a) => markAnnouncementRead(a.id).catch(() => {}));
    setItems((prev) => prev.map((a) => ({ ...a, is_read: true })));
    clearUnread();
  };

  const pinned    = items.filter((a) => a.pinned);
  const nonPinned = items.filter((a) => !a.pinned);

  return (
    <SafeBottomBar style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={s.title}>Announcements</Text>

        {unreadCount > 0 ? (
          <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 88 }} />
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { setLoading(true); loadItems(true).finally(() => setLoading(false)); }}
          >
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.secondary}
              colors={[COLORS.secondary]}
            />
          }
        >
          {/* Pinned section */}
          {pinned.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.accentBar} />
                <Text style={s.sectionTitle}>📌  Pinned</Text>
              </View>
              {pinned.map((a) => (
                <AnnouncementCard key={a.id} item={a} showPin onPress={() => handleOpen(a)} />
              ))}
            </>
          )}

          {/* All announcements */}
          <View style={[s.sectionHeader, { marginTop: pinned.length > 0 ? 8 : 0 }]}>
            <View style={s.accentBar} />
            <Text style={s.sectionTitle}>All Announcements</Text>
          </View>

          {nonPinned.map((a) => (
            <AnnouncementCard key={a.id} item={a} onPress={() => handleOpen(a)} />
          ))}

          {items.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📢</Text>
              <Text style={s.emptyText}>No announcements yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Detail bottom-sheet modal ────────────────────────────────────── */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeBottomBar style={s.modalBackdrop}>
          <TouchableOpacity style={s.modalDismiss} activeOpacity={1} onPress={handleClose} />
          <View style={s.modalSheet}>
            {selected && (
              <>
                <View style={s.modalHandle} />

                <View style={s.modalTop}>
                  <TypeTag type={selected.type} />
                  {selected.urgent && (
                    <View style={s.modalUrgent}>
                      <Text style={s.modalUrgentText}>● URGENT</Text>
                    </View>
                  )}
                  {selected.pinned && <Text style={{ fontSize: 16 }}>📌</Text>}
                </View>

                <Text style={s.modalTitle}>{selected.title}</Text>
                <Text style={s.modalMeta}>{formatDate(selected.publishedAt)}</Text>
                <Text style={s.modalBody}>{selected.message}</Text>

                <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={s.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeBottomBar>
      </Modal>
    </SafeBottomBar>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#EF4444', fontSize: 14 },
  retryBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  retryText: { color: '#000', fontWeight: '700' },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80, gap: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  accentBar: { width: 4, height: 18, backgroundColor: COLORS.secondary, borderRadius: 2 },
  sectionTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800' },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16, gap: 8,
  },
  cardUnread: { borderColor: COLORS.secondary + '40' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinIcon: { fontSize: 15 },
  urgentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  unreadDot: { marginLeft: 'auto', width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  cardTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800', lineHeight: 22 },
  cardDesc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: 10 },
  footerText: { color: COLORS.textMuted, fontSize: 11 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 20,
  },
  modalTop: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  modalUrgent: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  modalUrgentText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 6, lineHeight: 28 },
  modalMeta: { color: COLORS.textMuted, fontSize: 12, marginBottom: 14 },
  modalBody: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  closeBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  closeBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
