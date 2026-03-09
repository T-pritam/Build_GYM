import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { gymActivities, activityCategories, buildCoins } from '../../constants/dummyData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 14 * 2 - 12) / 2;

const DIFFICULTY_COLOR = {
  'Beginner friendly': '#4CAF50',
  'All levels': '#2196F3',
  Intermediate: '#FF9800',
  Advanced: '#F44336',
};

export default function ActivitiesScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const filtered =
    activeCategory === 'All'
      ? gymActivities
      : gymActivities.filter((a) => a.category === activeCategory);

  const handleBook = () => {
    if (!selectedSlot) return;
    setBookingConfirmed(true);
  };

  const closeModal = () => {
    setSelectedActivity(null);
    setSelectedSlot(null);
    setBookingConfirmed(false);
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { setSelectedActivity(item); setSelectedSlot(null); setBookingConfirmed(false); }}
      activeOpacity={0.85}
    >
      {/* Colored top panel */}
      <LinearGradient
        colors={[`${item.color}40`, `${item.color}15`]}
        style={styles.cardTop}
      >
        <Text style={styles.cardEmoji}>{item.emoji}</Text>
        {item.tag && (
          <View style={[styles.tagBadge, { backgroundColor: item.color }]}>
            <Text style={styles.tagText}>{item.tag}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>

        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
          <Text style={styles.cardMetaText}>{item.duration}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Ionicons name="people-outline" size={11} color={COLORS.textMuted} />
          <Text style={styles.cardMetaText}>Up to {item.maxParticipants}</Text>
        </View>

        {/* Coins cost */}
        <View style={styles.cardCost}>
          <MaterialCommunityIcons name="bitcoin" size={13} color={COLORS.secondary} />
          <Text style={styles.cardCostText}>{item.coinsPerSession}</Text>
          <Text style={styles.cardCostLabel}>/ session</Text>
        </View>
      </View>

      {/* Book strip */}
      <LinearGradient
        colors={[item.color, `${item.color}BB`]}
        style={styles.cardBookStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.cardBookText}>Book</Text>
        <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── FIXED HEADER ── */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Activities</Text>
            <Text style={styles.headerSub}>Book sessions with Build Coins</Text>
          </View>
          <View style={styles.coinsPill}>
            <MaterialCommunityIcons name="bitcoin" size={14} color={COLORS.secondary} />
            <Text style={styles.coinsPillText}>{buildCoins.balance.toLocaleString()}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── FIXED CATEGORY FILTER ── */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {activityCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── GRID ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderCard}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filtered.length} activit{filtered.length !== 1 ? 'ies' : 'y'}
            {activeCategory !== 'All' ? ` · ${activeCategory}` : ''}
          </Text>
        }
        ListFooterComponent={<View style={{ height: 110 }} />}
      />

      {/* ── BOOKING MODAL ── */}
      <Modal
        visible={!!selectedActivity}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {selectedActivity && (
              <>
                <View style={styles.modalHandle} />

                {bookingConfirmed ? (
                  /* ── CONFIRMATION VIEW ── */
                  <View style={styles.confirmWrap}>
                    <View style={styles.confirmIconContainer}>
                      <LinearGradient
                        colors={[`${selectedActivity.color}30`, `${selectedActivity.color}08`]}
                        style={styles.confirmIconWrap}
                      >
                        <Text style={{ fontSize: 52 }}>{selectedActivity.emoji}</Text>
                      </LinearGradient>
                      <View style={styles.confirmCheck}>
                        <Ionicons name="checkmark" size={22} color={COLORS.white} />
                      </View>
                    </View>
                    <Text style={styles.confirmTitle}>Booking Confirmed!</Text>
                    <Text style={styles.confirmSub}>
                      {selectedActivity.name} · {selectedSlot}
                    </Text>
                    <View style={styles.confirmCoinsRow}>
                      <MaterialCommunityIcons name="bitcoin" size={16} color={COLORS.secondary} />
                      <Text style={styles.confirmCoins}>
                        {selectedActivity.coinsPerSession} coins deducted
                      </Text>
                    </View>
                    <Text style={styles.confirmNote}>
                      Show this booking at reception before the session begins.
                    </Text>
                    <TouchableOpacity style={styles.confirmDoneBtn} onPress={closeModal}>
                      <Text style={styles.confirmDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* ── BOOKING DETAIL VIEW ── */
                  <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Top banner */}
                    <LinearGradient
                      colors={[`${selectedActivity.color}35`, `${selectedActivity.color}08`]}
                      style={styles.detailBanner}
                    >
                      <Text style={styles.detailEmoji}>{selectedActivity.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.detailTitleRow}>
                          <Text style={styles.detailName}>{selectedActivity.name}</Text>
                          {selectedActivity.tag && (
                            <View style={[styles.tagBadge, { backgroundColor: selectedActivity.color }]}>
                              <Text style={styles.tagText}>{selectedActivity.tag}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.detailCat, { color: selectedActivity.color }]}>
                          {selectedActivity.category}
                        </Text>
                      </View>
                    </LinearGradient>

                    {/* Stats row */}
                    <View style={styles.detailStatsRow}>
                      <View style={styles.detailStat}>
                        <Ionicons name="time-outline" size={18} color={COLORS.secondary} />
                        <Text style={styles.detailStatVal}>{selectedActivity.duration}</Text>
                        <Text style={styles.detailStatLbl}>Duration</Text>
                      </View>
                      <View style={styles.detailStatDivider} />
                      <View style={styles.detailStat}>
                        <Ionicons name="people-outline" size={18} color={COLORS.secondary} />
                        <Text style={styles.detailStatVal}>{selectedActivity.maxParticipants}</Text>
                        <Text style={styles.detailStatLbl}>Max People</Text>
                      </View>
                      <View style={styles.detailStatDivider} />
                      <View style={styles.detailStat}>
                        <View style={[
                          styles.diffDot,
                          { backgroundColor: DIFFICULTY_COLOR[selectedActivity.difficulty] || COLORS.secondary }
                        ]} />
                        <Text style={[
                          styles.detailStatVal,
                          { color: DIFFICULTY_COLOR[selectedActivity.difficulty] || COLORS.secondary, fontSize: 11 }
                        ]}>
                          {selectedActivity.difficulty}
                        </Text>
                        <Text style={styles.detailStatLbl}>Level</Text>
                      </View>
                    </View>

                    {/* Description */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>About</Text>
                      <Text style={styles.detailDesc}>{selectedActivity.description}</Text>
                    </View>

                    {/* Slots */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>Available Slots</Text>
                      <View style={styles.slotsGrid}>
                        {selectedActivity.slots.map((slot) => (
                          <TouchableOpacity
                            key={slot}
                            style={[
                              styles.slotChip,
                              selectedSlot === slot && styles.slotChipActive,
                            ]}
                            onPress={() => setSelectedSlot(slot)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color={selectedSlot === slot ? COLORS.secondary : COLORS.textMuted}
                            />
                            <Text style={[
                              styles.slotChipText,
                              selectedSlot === slot && styles.slotChipTextActive,
                            ]}>
                              {slot}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Cost summary */}
                    <View style={styles.costSummary}>
                      <View>
                        <Text style={styles.costLabel}>Session cost</Text>
                        <View style={styles.costRow}>
                          <MaterialCommunityIcons name="bitcoin" size={20} color={COLORS.secondary} />
                          <Text style={styles.costVal}>{selectedActivity.coinsPerSession}</Text>
                          <Text style={styles.costCoinsLabel}>Build Coins</Text>
                        </View>
                      </View>
                      <View style={styles.costBalance}>
                        <Text style={styles.costBalanceLabel}>Your balance</Text>
                        <Text style={styles.costBalanceVal}>{buildCoins.balance.toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Book button */}
                    <TouchableOpacity
                      style={[styles.bookBtn, !selectedSlot && styles.bookBtnDisabled]}
                      onPress={handleBook}
                      activeOpacity={selectedSlot ? 0.85 : 1}
                    >
                      <LinearGradient
                        colors={selectedSlot
                          ? [selectedActivity.color, `${selectedActivity.color}BB`]
                          : [COLORS.surface2, COLORS.surface2]}
                        style={styles.bookBtnGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <MaterialCommunityIcons
                          name="bitcoin"
                          size={18}
                          color={selectedSlot ? COLORS.white : COLORS.textDim}
                        />
                        <Text style={[styles.bookBtnText, !selectedSlot && styles.bookBtnTextDisabled]}>
                          {selectedSlot ? `Book · ${selectedActivity.coinsPerSession} Coins` : 'Select a Slot'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 32 }} />
                  </ScrollView>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: COLORS.white, marginBottom: 3 },
  headerSub: { fontSize: 13, color: COLORS.textSecondary },
  coinsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  coinsPillText: { fontSize: 14, fontWeight: '800', color: COLORS.secondary },

  // Filter
  filterWrap: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  filterRow: { paddingHorizontal: 14, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  filterChipTextActive: { color: COLORS.secondary },

  // Grid
  gridContent: { paddingHorizontal: 14, paddingTop: 4 },
  columnWrapper: { gap: 12, marginBottom: 12 },
  resultCount: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', paddingVertical: 10, paddingLeft: 2 },

  // Activity card
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  cardTop: {
    height: CARD_WIDTH * 0.72,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: { fontSize: 46 },
  tagBadge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  tagText: { fontSize: 9, fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },
  cardBody: { padding: 12, gap: 5 },
  cardName: { fontSize: 14, fontWeight: '900', color: COLORS.white },
  cardCategory: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: 11, color: COLORS.textSecondary },
  cardCost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  cardCostText: { fontSize: 16, fontWeight: '900', color: COLORS.secondary },
  cardCostLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  cardBookStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 5,
  },
  cardBookText: { fontSize: 12, fontWeight: '900', color: COLORS.white },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '92%', borderWidth: 1, borderColor: COLORS.border, paddingBottom: 0,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 16,
  },

  // Detail view
  detailBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 18, padding: 18, marginBottom: 18,
  },
  detailEmoji: { fontSize: 48 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  detailName: { fontSize: 22, fontWeight: '900', color: COLORS.white },
  detailCat: { fontSize: 13, fontWeight: '700' },

  // Stats row
  detailStatsRow: {
    flexDirection: 'row', backgroundColor: COLORS.background,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 20,
  },
  detailStat: { flex: 1, alignItems: 'center', gap: 4 },
  detailStatVal: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  detailStatLbl: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  detailStatDivider: { width: 1, backgroundColor: COLORS.border },
  diffDot: { width: 8, height: 8, borderRadius: 4 },

  // Description
  detailSection: { marginBottom: 20 },
  detailSectionLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  detailDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  // Slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  slotChipActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow },
  slotChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  slotChipTextActive: { color: COLORS.secondary },

  // Cost summary
  costSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16,
  },
  costLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  costVal: { fontSize: 24, fontWeight: '900', color: COLORS.secondary },
  costCoinsLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  costBalance: { alignItems: 'flex-end' },
  costBalanceLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  costBalanceVal: { fontSize: 18, fontWeight: '800', color: COLORS.white },

  // Book button
  bookBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnGrad: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 16, gap: 8,
  },
  bookBtnText: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  bookBtnTextDisabled: { color: COLORS.textDim },

  // Confirmation
  confirmWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, gap: 10 },
  confirmIconContainer: { position: 'relative', marginBottom: 8 },
  confirmIconWrap: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmCheck: {
    position: 'absolute', bottom: -8, right: -8,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.surface,
  },
  confirmTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white, marginTop: 8 },
  confirmSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  confirmCoinsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondaryGlow, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    marginTop: 4,
  },
  confirmCoins: { fontSize: 14, fontWeight: '800', color: COLORS.secondary },
  confirmNote: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center',
    lineHeight: 18, marginHorizontal: 12,
  },
  confirmDoneBtn: {
    marginTop: 12, paddingVertical: 14, paddingHorizontal: 48,
    borderRadius: 16, backgroundColor: COLORS.secondaryGlow,
    borderWidth: 1, borderColor: COLORS.secondary,
  },
  confirmDoneBtnText: { fontSize: 16, fontWeight: '900', color: COLORS.secondary },
});
