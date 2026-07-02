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
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchAnnouncement, markAnnouncementRead } from '../../services/announcementService';
import { useAnnouncementStore } from '../../store/announcementStore';

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
  general:       '#64748B',
  promotion:     '#EAB308',
  health:        '#22C55E',
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
  const [item, setItem]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

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
        <TouchableOpacity style={s.retryBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}>
          <Text style={s.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        bounces={false}
      >
        {/* Handle bar */}
        <View style={s.handle} />

        {/* Cover image */}
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={s.coverImage}
            contentFit="cover"
          />
        )}

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

        {/* Close / back */}
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} activeOpacity={0.85}>
          <Text style={s.closeBtnText}>CLOSE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
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

  body: { paddingBottom: 48 },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: COLORS.border,
    marginTop: 12, marginBottom: 16,
  },
  coverImage: {
    width: '100%', height: 200,
    backgroundColor: COLORS.background,
    marginBottom: 20,
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 20 },
  urgentPill: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  urgentText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },

  title:     { color: COLORS.white, fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 8, paddingHorizontal: 20 },
  meta:      { color: COLORS.textMuted, fontSize: 12, marginBottom: 20, paddingHorizontal: 20 },
  divider:   { height: 1, backgroundColor: COLORS.border, marginBottom: 20, marginHorizontal: 20 },
  body_text: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 24, paddingHorizontal: 20, marginBottom: 28 },

  closeBtn: {
    marginHorizontal: 20, backgroundColor: COLORS.secondary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  closeBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
