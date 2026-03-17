/**
 * AnnouncementDetailScreen
 * Opened via deep-link navigation (notification tap → buildfitness://announcements/<id>).
 * Uses the same card/modal aesthetic as the Announcements list.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchAnnouncement, markAnnouncementRead } from '../../services/announcementService';
import { useAnnouncementStore } from '../../store/announcementStore';

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

export default function AnnouncementDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const markOneRead = useAnnouncementStore((s) => s.markOneRead);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchAnnouncement(id);
        if (cancelled) return;
        setItem(data);
        if (!data.is_read) {
          markAnnouncementRead(id).catch(() => {});
          markOneRead();
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <View style={s.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={COLORS.secondary} size="large" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={s.centered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textDim} />
        <Text style={s.errorText}>Announcement not found.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={s.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Announcement</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
      >
        {/* Type tags row */}
        <View style={s.topRow}>
          <TypeTag type={item.type} />
          {item.urgent && (
            <View style={s.urgentPill}>
              <Text style={s.urgentText}>● URGENT</Text>
            </View>
          )}
          {item.pinned && <Text style={{ fontSize: 16 }}>📌</Text>}
        </View>

        {/* Title */}
        <Text style={s.title}>{item.title}</Text>

        {/* Date */}
        <Text style={s.meta}>{formatDate(item.publishedAt)}</Text>

        {/* Divider */}
        <View style={s.divider} />

        {/* Body */}
        <Text style={s.body_text}>{item.message}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  errorText: { fontSize: 14, color: COLORS.textMuted },
  retryBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  retryText: { color: '#000', fontWeight: '700' },

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
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  body: { padding: 20, paddingBottom: 60 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  urgentPill: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  urgentText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },

  title:     { color: COLORS.white, fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 8 },
  meta:      { color: COLORS.textMuted, fontSize: 12, marginBottom: 20 },
  divider:   { height: 1, backgroundColor: COLORS.border, marginBottom: 20 },
  body_text: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 24 },
});
