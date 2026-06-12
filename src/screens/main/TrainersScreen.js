import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { fetchTrainers, fetchMyTrainer } from '../../services/trainerService';
import SafeBottomBar from '../../components/SafeBottomBar';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2,
  secondary: THEME.primaryLight, secondaryDark: THEME.primary, secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  primary: THEME.primary, primaryBright: THEME.primaryBright, cyan: THEME.cyan,
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.04)', glassBorder: 'rgba(255,255,255,0.08)',
  success: THEME.success, white: THEME.white,
};

export default function TrainersScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [trainers, setTrainers] = useState([]);
  const [myTrainer, setMyTrainer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchTrainers(), fetchMyTrainer()])
      .then(([all, mine]) => {
        if (all.status === 'fulfilled') setTrainers(all.value || []);
        if (mine.status === 'fulfilled') setMyTrainer(mine.value || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const filters = [
    { id: 'all', label: 'All', value: 'all' },
    { id: 'available', label: 'Available', value: 'available' },
    { id: 'specialized', label: 'Specialized', value: 'specialized' },
  ];

  // Exclude the assigned trainer from the grid (it shows in its own section).
  const gridTrainers = myTrainer ? trainers.filter((t) => t.id !== myTrainer.id) : trainers;

  const filteredTrainers = gridTrainers.filter((trainer) => {
    const q = searchText.trim().toLowerCase();
    const matchesSearch =
      !q ||
      trainer.name.toLowerCase().includes(q) ||
      trainer.specialisation.toLowerCase().includes(q);

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'available' && trainer.available) ||
      (selectedFilter === 'specialized' && trainer.tags.length > 0);

    return matchesSearch && matchesFilter;
  });

  const openDetail = (trainer, list, isMyTrainer = false) => {
    const index = Math.max(0, list.findIndex((t) => t.id === trainer.id));
    navigation.navigate('TrainerDetail', { trainer, trainerList: list, index, isMyTrainer });
  };

  const renderTrainerCard = ({ item: trainer }) => (
    <TouchableOpacity
      style={styles.trainerCard}
      onPress={() => openDetail(trainer, filteredTrainers)}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      {trainer.profilePhotoUrl ? (
        <View style={styles.trainerAvatar}>
          <Image source={{ uri: trainer.profilePhotoUrl }} style={styles.trainerAvatarPhoto} />
          <View style={[styles.trainerAvailBadge, { backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted }]}>
            <Text style={styles.trainerAvailBadgeText}>{trainer.available ? 'Available' : 'Full'}</Text>
          </View>
        </View>
      ) : (
        <LinearGradient colors={['rgba(127,41,130,0.45)', COLORS.surface2]} style={styles.trainerAvatar}>
          <Text style={styles.trainerAvatarText}>{trainer.name.charAt(0)}</Text>
          <View style={[styles.trainerAvailBadge, { backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted }]}>
            <Text style={styles.trainerAvailBadgeText}>{trainer.available ? 'Available' : 'Full'}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Details */}
      <View style={styles.trainerDetails}>
        <Text style={styles.trainerName} numberOfLines={1}>{trainer.name}</Text>
        <Text style={styles.trainerSpec} numberOfLines={2}>{trainer.specialisation}</Text>

        <View style={styles.trainerMetaRow}>
          <View style={styles.trainerRatingRow}>
            <Ionicons name="star" size={10} color={COLORS.secondary} />
            <Text style={styles.trainerRating}>{trainer.rating}</Text>
          </View>
          <View style={styles.trainerDivider} />
          <Text style={styles.trainerExp}>{trainer.experience}</Text>
        </View>

        <Text style={styles.trainerClients}>{trainer.clients} clients</Text>

        <View style={styles.trainerTags}>
          {trainer.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.trainerTag}>
              <Text style={styles.trainerTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent />
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.cyan} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Our Trainers</Text>
          <Text style={styles.headerSub}>{trainers.length} trainer{trainers.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search trainers..."
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterBtn, selectedFilter === filter.id && styles.filterBtnActive]}
              onPress={() => setSelectedFilter(filter.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterBtnText, selectedFilter === filter.id && styles.filterBtnTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 60 }} size="large" />
        ) : (
          <>
            {/* Assigned trainer */}
            {myTrainer && (
              <View style={styles.assignedSection}>
                <Text style={styles.sectionLabel}>YOUR TRAINER</Text>
                <TouchableOpacity
                  style={styles.assignedCard}
                  activeOpacity={0.9}
                  onPress={() => openDetail(myTrainer, [myTrainer, ...filteredTrainers], true)}
                >
                  {myTrainer.profilePhotoUrl ? (
                    <Image source={{ uri: myTrainer.profilePhotoUrl }} style={styles.assignedPhoto} />
                  ) : (
                    <LinearGradient colors={['rgba(127,41,130,0.5)', COLORS.surface2]} style={styles.assignedPhoto}>
                      <Text style={styles.assignedInitial}>{myTrainer.name.charAt(0)}</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.assignedInfo}>
                    <Text style={styles.assignedName} numberOfLines={1}>{myTrainer.name}</Text>
                    <Text style={styles.assignedSpec} numberOfLines={1}>{myTrainer.specialisation}</Text>
                    <View style={styles.assignedMetaRow}>
                      <Ionicons name="star" size={12} color={COLORS.cyan} />
                      <Text style={styles.assignedRating}>{myTrainer.rating}</Text>
                      <View style={styles.trainerDivider} />
                      <Text style={styles.assignedExp}>{myTrainer.experience}</Text>
                    </View>
                  </View>
                  <View style={styles.viewProfileChip}>
                    <Text style={styles.viewProfileText}>VIEW</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.white} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* All trainers grid */}
            <Text style={styles.sectionLabel}>{myTrainer ? 'ALL TRAINERS' : ' '}</Text>
            {filteredTrainers.length > 0 ? (
              <FlatList
                data={filteredTrainers}
                renderItem={renderTrainerCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContainer}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={56} color={COLORS.textMuted} />
                <Text style={styles.emptyStateText}>No trainers found</Text>
                <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, backgroundColor: 'rgba(127,41,130,0.06)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.glass,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 17, color: COLORS.white },
  headerSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  scroll: { padding: 20 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glass,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.white, fontFamily: FONTS.body, padding: 0 },

  // Filters
  filterSection: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  filterBtnActive: { backgroundColor: 'rgba(127,41,130,0.18)', borderColor: COLORS.primary },
  filterBtnText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textMuted },
  filterBtnTextActive: { color: COLORS.primaryBright },

  sectionLabel: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.secondary, letterSpacing: 2, marginBottom: 12 },

  // Assigned trainer
  assignedSection: { marginBottom: 24 },
  assignedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(127,41,130,0.10)', borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.primaryBorder, padding: 14,
  },
  assignedPhoto: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  assignedInitial: { fontFamily: FONTS.display, fontSize: 28, color: COLORS.white },
  assignedInfo: { flex: 1 },
  assignedName: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white },
  assignedSpec: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 6 },
  assignedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedRating: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.white },
  assignedExp: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  viewProfileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryBright, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  viewProfileText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.white, letterSpacing: 1 },

  // Grid
  gridContainer: { gap: 14 },
  gridRow: { gap: 14 },
  trainerCard: {
    flex: 1, backgroundColor: COLORS.glass, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden',
  },
  trainerAvatar: { height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  trainerAvatarText: { fontFamily: FONTS.display, fontSize: 40, color: COLORS.white },
  trainerAvatarPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  trainerAvailBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, position: 'absolute', bottom: 8, right: 8 },
  trainerAvailBadgeText: { fontFamily: FONTS.label, fontSize: 8, color: COLORS.white, letterSpacing: 0.5 },

  trainerDetails: { padding: 12, gap: 4 },
  trainerName: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, marginBottom: 2 },
  trainerSpec: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textSecondary, lineHeight: 15, marginBottom: 6 },
  trainerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  trainerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trainerRating: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.white },
  trainerDivider: { width: 2, height: 2, borderRadius: 1, backgroundColor: COLORS.textMuted },
  trainerExp: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted },
  trainerClients: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, marginBottom: 6 },
  trainerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  trainerTag: {
    backgroundColor: COLORS.secondaryGlow, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  trainerTagText: { fontFamily: FONTS.label, fontSize: 8, color: COLORS.secondary, letterSpacing: 0.3 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyStateText: { fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.white },
  emptyStateSubtext: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
});
