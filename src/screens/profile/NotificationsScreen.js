import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { fetchAnnouncements, markAnnouncementRead } from '../../services/announcementService';
import { useAnnouncementStore } from '../../store/announcementStore';
import { handleDeepLink } from '../../services/notificationService';
import SafeBottomBar from '../../components/SafeBottomBar';

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_LABEL = {
  general:       'General',
  event:         'Event',
  maintenance:   'Maintenance',
  promotion:     'Promotion',
  health:        'Health',
};
const TYPE_COLOR = {
  event:         '#3B82F6',
  maintenance:   '#EF4444',
  general:       '#94A3B8',
  promotion:     '#F5B041',
  health:        '#4ADE80',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── TypeTag ─────────────────────────────────────────────────────────────────
function TypeTag({ type }) {
  const color = TYPE_COLOR[type] ?? '#94A3B8';
  const label = TYPE_LABEL[type] ?? type;
  return (
    <View style={[tt.tag, { borderColor: color + '60', backgroundColor: color + '20' }]}>
      <Text style={[tt.tagText, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}
const tt = StyleSheet.create({
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontFamily: FONTS.label, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
});

// ─── Card ─────────────────────────────────────────────────────────────────────
function AnnouncementCard({ item, onPress, showPin }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.card, showPin && { borderColor: COLORS.primaryBorder }, !item.is_read && s.cardUnread]}
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
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selected, setSelected]         = useState(null);
  const [error, setError]               = useState(null);
  const [nextCursor, setNextCursor]     = useState(null);

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
    if (!item.is_read) {
      markAnnouncementRead(item.id).catch(() => {});
      markOneRead();
      setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, is_read: true } : a));
    }
    if (item.deepLink) {
      handleDeepLink(item.deepLink);
      return;
    }
    setSelected(item);
  };

  const handleClose = () => setSelected(null);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const handleMarkAllRead = () => {
    items.filter((a) => !a.is_read).forEach((a) => markAnnouncementRead(a.id).catch(() => {}));
    setItems((prev) => prev.map((a) => ({ ...a, is_read: true })));
    clearUnread();
  };

  const pinned    = items.filter((a) => a.pinned && (!a.expiresAt || new Date(a.expiresAt) > new Date()));
  const nonPinned = items.filter((a) => !a.pinned && (!a.expiresAt || new Date(a.expiresAt) > new Date()));

  return (
    <SafeBottomBar style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}>
          <Ionicons name="arrow-back" size={18} color={COLORS.textPrimary} />
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
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
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
              tintColor={COLORS.primaryLight}
              colors={[COLORS.primaryLight]}
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
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={s.modalHandle} />

                {selected.imageUrl && (
                  <Image
                    source={{ uri: selected.imageUrl }}
                    style={s.modalImage}
                    contentFit="cover"
                  />
                )}

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
              </ScrollView>
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
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceLow,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: COLORS.white, fontSize: 20, fontFamily: FONTS.headline },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  markAllText: { fontSize: 11, fontFamily: FONTS.label, color: COLORS.primaryLight },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#EF4444', fontSize: 14, fontFamily: FONTS.body },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 9,
  },
  retryText: { color: COLORS.white, fontFamily: FONTS.bodyBold },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80, gap: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  accentBar: { width: 4, height: 18, backgroundColor: COLORS.primaryNeon, borderRadius: 2 },
  sectionTitle: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.headline },

  // Card
  card: {
    backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16, gap: 8,
  },
  cardUnread: { borderColor: COLORS.primaryBorder },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinIcon: { fontSize: 15 },
  urgentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  unreadDot: { marginLeft: 'auto', width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primaryLight },
  cardTitle: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.bodyBold, lineHeight: 22 },
  cardDesc: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.body, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: 10 },
  footerText: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.body },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontFamily: FONTS.body },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: COLORS.surfaceLow,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    maxHeight: '80%',
  },
  modalImage: {
    width: '100%', height: 180,
    borderRadius: 12, marginBottom: 16,
    backgroundColor: COLORS.background,
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
  modalUrgentText: { color: '#EF4444', fontSize: 10, fontFamily: FONTS.label },
  modalTitle: { color: COLORS.white, fontSize: 20, fontFamily: FONTS.headline, marginBottom: 6, lineHeight: 28 },
  modalMeta: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.body, marginBottom: 14 },
  modalBody: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.body, lineHeight: 22, marginBottom: 20 },
  closeBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primarySoft,
  },
  closeBtnText: { color: COLORS.primaryLight, fontFamily: FONTS.label, fontSize: 13, letterSpacing: 1 },
});
