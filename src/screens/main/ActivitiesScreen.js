import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchActivitySessions } from '../../services/api';

const TYPE_DISPLAY = {
  yoga:       { emoji: '🧘', color: ['#7C3AED', '#4C1D95'] },
  boxing:     { emoji: '🥊', color: ['#DC2626', '#7F1D1D'] },
  pickleball: { emoji: '🏓', color: ['#16A34A', '#14532D'] },
  hiit:       { emoji: '⚡', color: ['#D97706', '#78350F'] },
  sauna:      { emoji: '♨️', color: ['#B45309', '#451A03'] },
  cycling:    { emoji: '🚴', color: ['#2563EB', '#1E3A8A'] },
  other:      { emoji: '🏋️', color: ['#374151', '#1F2937'] },
};

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
}

export default function ActivitiesScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivitySessions()
      .then((data) => setSessions(data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activities</Text>
        <TouchableOpacity
          style={styles.bookingsBtn}
          onPress={() => navigation.navigate('MyBookings')}
        >
          <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.bookingsBtnText}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Book sessions & amenities with Build Coins</Text>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            {sessions.map((session) => {
              const display = TYPE_DISPLAY[session.type] || TYPE_DISPLAY.other;
              const spotsLeft = session.capacityMax - session.capacityBooked;
              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('ActivityDetail', { session })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.heroBlock, { backgroundColor: display.color[1] }]}>
                    <View style={[styles.heroGradient, { backgroundColor: display.color[0] + '99' }]} />
                    <Text style={styles.heroEmoji}>{display.emoji}</Text>
                    <Text style={styles.heroLabel}>{session.title}</Text>
                    {spotsLeft <= 3 && (
                      <View style={styles.limitedBadge}>
                        <Text style={styles.limitedText}>{spotsLeft} spots left</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>{fmtDate(session.sessionDate)} · {fmtTime(session.sessionTime)}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardCost}>₿ {session.coinCost}</Text>
                      <Text style={styles.cardDot}>·</Text>
                      <Text style={styles.cardDuration}>{session.capacityBooked}/{session.capacityMax}</Text>
                    </View>
                    <Text style={styles.bookNow}>BOOK NOW →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {sessions.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="calendar-outline" size={48} color="#555" />
              <Text style={{ color: '#666', marginTop: 12 }}>No upcoming sessions</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(233,99,22,0.1)' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 4,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff' },
  bookingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.secondary + '55', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  bookingsBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  subtitle: { fontSize: 14, color: '#9A9A9A', paddingHorizontal: 20, marginBottom: 20, marginTop: 4 },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  card: {
    width: '47%', backgroundColor: '#1C1C1E', borderRadius: 18,
    borderWidth: 1, borderColor: '#333', overflow: 'hidden',
  },
  heroBlock: {
    aspectRatio: 4 / 5, position: 'relative',
    alignItems: 'flex-start', justifyContent: 'flex-end', padding: 12,
  },
  heroGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 0,
  },
  heroEmoji: { fontSize: 48, position: 'absolute', top: '30%', alignSelf: 'center' },
  heroLabel: { fontSize: 18, fontWeight: '900', color: '#fff', zIndex: 1 },
  limitedBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  limitedText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  cardFooter: { padding: 12, gap: 6 },
  cardDate: { fontSize: 11, color: '#9A9A9A', fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDuration: { fontSize: 12, color: '#9A9A9A', fontWeight: '600' },
  cardDot: { fontSize: 12, color: '#555' },
  cardCost: { fontSize: 12, color: COLORS.secondary, fontWeight: '700' },
  bookNow: { fontSize: 10, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1.5 },
});
