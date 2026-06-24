import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';

// Category accent (icon-tile background when unlocked).
const CAT = {
  attendance:  { key: 'attendance',  label: 'Attendance',  tile: '#06B6D4' },
  performance: { key: 'performance', label: 'Performance', tile: '#7C3AED' },
  social:      { key: 'social',      label: 'Social',      tile: '#3B82F6' },
  café:        { key: 'café',        label: 'Café',        tile: '#F59E0B' },
  elite:       { key: 'elite',       label: 'Elite',       tile: '#FFD700' },
};

const FILTERS = ['all', 'attendance', 'performance', 'social', 'café', 'elite'];

// Static achievements (UI only — mirrors the Stitch list).
const ACHIEVEMENTS = [
  { cat: 'attendance',  icon: 'directions-walk',    name: 'First Step',       xp: '+50 XP' },
  { cat: 'attendance',  icon: 'calendar-today',     name: 'Week Warrior',     xp: '+100 XP' },
  { cat: 'attendance',  icon: 'calendar-today',     name: 'Iron Week',        xp: '+300 XP' },
  { cat: 'attendance',  icon: 'calendar-today',     name: 'Two Week Streak',  xp: '+500 XP' },
  { cat: 'attendance',  icon: 'workspace-premium',  name: 'Century Club',     xp: '+1000 XP' },
  { cat: 'attendance',  icon: 'lock',               name: 'One Month Strong', locked: true, progress: [14, 30] },
  { cat: 'attendance',  icon: 'calendar-today',     name: 'Early Bird',       xp: '+150 XP' },
  { cat: 'attendance',  icon: 'lock',               name: 'Comeback Kid',     locked: true, progress: [0, 1] },

  { cat: 'performance', icon: 'fitness-center',     name: 'First Burn',       xp: '+50 XP' },
  { cat: 'performance', icon: 'fitness-center',     name: 'Calorie Crusher',  xp: '+200 XP' },
  { cat: 'performance', icon: 'lock',               name: 'Inferno',          locked: true, progress: [740, 1000] },
  { cat: 'performance', icon: 'fitness-center',     name: 'HIIT King',        xp: '+300 XP' },
  { cat: 'performance', icon: 'lock',               name: 'Cycle Champion',   locked: true, progress: [8, 15] },
  { cat: 'performance', icon: 'lock',               name: 'All Rounder',      locked: true, progress: [4, 6] },
  { cat: 'performance', icon: 'military-tech',      name: 'Beast Mode',       xp: '+750 XP' },
  { cat: 'performance', icon: 'lock',               name: 'Unstoppable',      locked: true, progress: [31, 50] },

  { cat: 'social',      icon: 'group',              name: 'Community Starter', xp: '+50 XP' },
  { cat: 'social',      icon: 'group',              name: 'First Referral',    xp: '+150 XP' },
  { cat: 'social',      icon: 'group',              name: 'Squad Goals',       xp: '+300 XP' },
  { cat: 'social',      icon: 'lock',               name: 'Ambassador',        locked: true, progress: [3, 5] },

  { cat: 'café',        icon: 'local-cafe',         name: 'Caffeine Fix',      xp: '+50 XP' },
  { cat: 'café',        icon: 'lock',               name: 'Coffee Connoisseur', locked: true, progress: [5, 20] },

  { cat: 'elite',       icon: 'workspace-premium',  name: 'Elite Member',      xp: '+1000 XP' },
  { cat: 'elite',       icon: 'lock',               name: 'Legend',            locked: true, progress: [0, 1] },
];

export default function AchievementsScreen({ navigation }) {
  const [filter, setFilter] = useState('all');

  const list = useMemo(
    () => (filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.cat === filter)),
    [filter],
  );

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Floating header */}
      <TouchableOpacity style={styles.floatLeft} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
        <GradientIcon name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Achievements</Text>

      {/* XP line */}
      <Text style={styles.xpLine}>2,480 XP</Text>

      {/* Category filter strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTERS.map((f) => {
          const activeChip = filter === f;
          const label = f === 'all' ? 'All' : CAT[f].label;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, activeChip && styles.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.85}
            >
              {activeChip && (
                <LinearGradient
                  colors={['#7C3AED', '#00BCD4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
              )}
              <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.listScroll} contentContainerStyle={styles.list}>
        {list.map((a, i) => {
          const tile = a.locked ? 'rgba(255,255,255,0.06)' : CAT[a.cat].tile;
          const pct = a.progress ? Math.round((a.progress[0] / a.progress[1]) * 100) : 0;
          return (
            <View key={`${a.name}-${i}`} style={styles.card}>
              <View style={[styles.iconTile, { backgroundColor: tile }]}>
                <MaterialIcons
                  name={a.icon}
                  size={22}
                  color={a.locked ? COLORS.textMuted : '#FFFFFF'}
                />
              </View>
              <View style={styles.cardMid}>
                <Text style={[styles.cardName, a.locked && styles.cardNameLocked]} numberOfLines={1}>
                  {a.name}
                </Text>
                {a.locked && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <LinearGradient
                        colors={['#7C3AED', '#00BCD4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${pct}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{a.progress[0]} / {a.progress[1]}</Text>
                  </View>
                )}
              </View>
              {!a.locked && (
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>{a.xp}</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  floatLeft: { position: 'absolute', top: 52, left: 20, zIndex: 100, padding: 4 },
  headerTitle: {
    fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white,
    textAlign: 'center', marginTop: 54,
  },
  xpLine: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },

  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  chip: {
    height: 32, paddingHorizontal: 14, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { borderColor: 'transparent' },
  chipText: {
    fontFamily: FONTS.bodyMedium, fontSize: 12, lineHeight: 16, color: COLORS.textMuted,
    includeFontPadding: false, textAlignVertical: 'center',
  },
  chipTextActive: { color: '#000', fontFamily: FONTS.bodyBold },

  listScroll: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  iconTile: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardMid: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  cardName: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  cardNameLocked: { color: COLORS.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, marginLeft: 8 },
  xpBadge: {
    marginLeft: 10, backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  xpBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#A78BFA' },
});
