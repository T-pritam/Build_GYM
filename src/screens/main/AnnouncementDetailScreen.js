/**
 * AnnouncementDetailScreen
 * Opened via deep-link navigation (notification tap → buildfitness://announcements/<id>).
 * Uses the same card/modal aesthetic as the Announcements list.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchAnnouncement, markAnnouncementRead } from '../../services/announcementService';
import { useAnnouncementStore } from '../../store/announcementStore';
import { fetchTrialRequest, confirmTrialSession, rejectTrialSession } from '../../services/trainerService';

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_LABEL = {
  general:       'General',
  event:         'Event',
  maintenance:   'Maintenance',
  promotion:     'Promotion',
  health:        'Health',
  trial_booking: 'Trial Session',
};
const TYPE_COLOR = {
  event:         '#3B82F6',
  maintenance:   '#EF4444',
  general:       '#64748B',
  promotion:     '#EAB308',
  health:        '#22C55E',
  trial_booking: '#E96316',
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
  const [trialRequest, setTrialRequest] = useState(null);
  const [trialLoading, setTrialLoading] = useState(false);

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
        // Load trial request status for trial_booking announcements
        if (data.type === 'trial_booking' && data.trialRequestId) {
          fetchTrialRequest(data.trialRequestId)
            .then(r => { if (!cancelled) setTrialRequest(r); })
            .catch(() => {});
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

        {/* Trial booking actions */}
        {item.type === 'trial_booking' && trialRequest && (
          <View style={s.trialActions}>
            {trialRequest.status === 'accepted' && (
              <>
                <TouchableOpacity
                  style={[s.confirmBtn, trialLoading && { opacity: 0.6 }]}
                  disabled={trialLoading}
                  onPress={async () => {
                    setTrialLoading(true);
                    try {
                      await confirmTrialSession(trialRequest.id);
                      setTrialRequest(prev => ({ ...prev, status: 'member_confirmed' }));
                    } catch (e) {
                      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to confirm.');
                    } finally { setTrialLoading(false); }
                  }}
                >
                  {trialLoading
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={s.confirmBtnText}>Confirm Session</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.rejectBtn, trialLoading && { opacity: 0.6 }]}
                  disabled={trialLoading}
                  onPress={async () => {
                    setTrialLoading(true);
                    try {
                      await rejectTrialSession(trialRequest.id);
                      setTrialRequest(prev => ({ ...prev, status: 'member_rejected' }));
                    } catch (e) {
                      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to reject.');
                    } finally { setTrialLoading(false); }
                  }}
                >
                  <Text style={s.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
            {trialRequest.status === 'member_confirmed' && (
              <View style={s.trialConfirmedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={s.trialConfirmedText}>Session Confirmed</Text>
              </View>
            )}
            {trialRequest.status === 'member_rejected' && (
              <View style={s.trialRejectedBadge}>
                <Text style={s.trialRejectedText}>You declined this session</Text>
              </View>
            )}
          </View>
        )}

        {/* Close / back */}
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
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

  // Trial booking actions
  trialActions: { paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  confirmBtn: {
    height: 48, borderRadius: 12, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  rejectBtn: {
    height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  trialConfirmedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  trialConfirmedText: { color: '#22C55E', fontWeight: '700', fontSize: 13 },
  trialRejectedBadge: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.08)', borderWidth: 1, borderColor: COLORS.border,
  },
  trialRejectedText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
});
