import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const ACTIVITIES = [
  { id: 'yoga',    label: 'Yoga',       duration: '45 min', cost: 80,  emoji: '🧘', color: ['#7C3AED', '#4C1D95'], icon: 'person-outline' },
  { id: 'boxing',  label: 'Boxing',     duration: '45 min', cost: 80,  emoji: '🥊', color: ['#DC2626', '#7F1D1D'], icon: 'fitness-outline' },
  { id: 'pickle',  label: 'Pickleball', duration: '45 min', cost: 80,  emoji: '🏓', color: ['#16A34A', '#14532D'], icon: 'tennisball-outline' },
  { id: 'hiit',    label: 'HIIT',       duration: '45 min', cost: 80,  emoji: '⚡', color: ['#D97706', '#78350F'], icon: 'flash-outline' },
  { id: 'sauna',   label: 'Sauna & Steam', duration: '45 min', cost: 80, emoji: '♨️', color: ['#B45309', '#451A03'], icon: 'water-outline' },
  { id: 'cycle',   label: 'Cycling',    duration: '30 min', cost: 60,  emoji: '🚴', color: ['#2563EB', '#1E3A8A'], icon: 'bicycle-outline' },
];

export default function ActivitiesScreen({ navigation }) {
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {ACTIVITIES.map((act) => (
            <TouchableOpacity
              key={act.id}
              style={styles.card}
              onPress={() => navigation.navigate('ActivityDetail', { activity: act })}
              activeOpacity={0.85}
            >
              {/* Hero color block */}
              <View style={[styles.heroBlock, { backgroundColor: act.color[1] }]}>
                <View style={[styles.heroGradient, { backgroundColor: act.color[0] + '99' }]} />
                <Text style={styles.heroEmoji}>{act.emoji}</Text>
                <Text style={styles.heroLabel}>{act.label}</Text>
              </View>

              {/* Info footer */}
              <View style={styles.cardFooter}>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardDuration}>{act.duration}</Text>
                  <Text style={styles.cardDot}>·</Text>
                  <Text style={styles.cardCost}>₿ {act.cost}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ActivityDetail', { activity: act })}
                >
                  <Text style={styles.bookNow}>BOOK NOW →</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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

  cardFooter: { padding: 12, gap: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDuration: { fontSize: 12, color: '#9A9A9A', fontWeight: '600' },
  cardDot: { fontSize: 12, color: '#555' },
  cardCost: { fontSize: 12, color: COLORS.secondary, fontWeight: '700' },
  bookNow: { fontSize: 10, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1.5 },
});
