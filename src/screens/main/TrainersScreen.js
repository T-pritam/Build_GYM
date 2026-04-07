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
import { COLORS } from '../../constants/colors';
import { fetchTrainers } from '../../services/trainerService';
import SafeBottomBar from '../../components/SafeBottomBar';

export default function TrainersScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers()
      .then((data) => setTrainers(data || []))
      .catch(() => setTrainers([]))
      .finally(() => setLoading(false));
  }, []);

  const filters = [
    { id: 'all', label: 'All', value: 'all' },
    { id: 'available', label: 'Available', value: 'available' },
    { id: 'specialized', label: 'Specialized', value: 'specialized' },
  ];

  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch =
      trainer.name.toLowerCase().includes(searchText.toLowerCase()) ||
      trainer.specialisation.toLowerCase().includes(searchText.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'available' && trainer.available) ||
      (selectedFilter === 'specialized' && trainer.tags.length > 0);

    return matchesSearch && matchesFilter;
  });

  const renderTrainerCard = ({ item: trainer }) => (
    <TouchableOpacity
      style={styles.trainerCard}
      onPress={() => navigation.navigate('TrainerDetail', { trainer })}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      {trainer.profilePhotoUrl ? (
        <View style={styles.trainerAvatar}>
          <Image source={{ uri: trainer.profilePhotoUrl }} style={styles.trainerAvatarPhoto} />
          <View style={[
            styles.trainerAvailBadge,
            { backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted },
          ]}>
            <Text style={styles.trainerAvailBadgeText}>
              {trainer.available ? 'Available' : 'Full'}
            </Text>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={['#2A1200', COLORS.secondaryDark, '#1A0800']}
          style={styles.trainerAvatar}
        >
          <Text style={styles.trainerAvatarText}>{trainer.name.charAt(0)}</Text>
          <View style={[
            styles.trainerAvailBadge,
            { backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted },
          ]}>
            <Text style={styles.trainerAvailBadgeText}>
              {trainer.available ? 'Available' : 'Full'}
            </Text>
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Our Trainers</Text>
          <Text style={styles.headerSub}>{filteredTrainers.length} trainer{filteredTrainers.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trainers..."
              placeholderTextColor={COLORS.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterBtn,
                selectedFilter === filter.id && styles.filterBtnActive,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  selectedFilter === filter.id && styles.filterBtnTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trainers Grid */}
        {loading ? (
          <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 60 }} size="large" />
        ) : filteredTrainers.length > 0 ? (
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

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  scroll: { padding: 20 },

  // Search
  searchSection: { marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: COLORS.white, fontWeight: '500',
  },

  // Filters
  filterSection: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.secondary, borderColor: COLORS.secondary,
  },
  filterBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterBtnTextActive: { color: COLORS.white },

  // Grid
  gridContainer: { gap: 14 },
  gridRow: { gap: 14 },
  trainerCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },

  // Trainer Avatar
  trainerAvatar: {
    height: 140, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 12, gap: 8, position: 'relative',
  },
  trainerAvatarText: { fontSize: 40, fontWeight: '900', color: COLORS.white },
  trainerAvatarPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  trainerAvailBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    position: 'absolute', bottom: 8, right: 8,
  },
  trainerAvailBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },

  // Trainer Details
  trainerDetails: { padding: 12, gap: 4 },
  trainerName: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  trainerSpec: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15, marginBottom: 6 },
  trainerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  trainerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trainerRating: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  trainerDivider: { width: 2, height: 2, borderRadius: 1, backgroundColor: COLORS.textMuted },
  trainerExp: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  trainerClients: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 6 },
  trainerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  trainerTag: {
    backgroundColor: COLORS.secondaryGlow, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  trainerTagText: { fontSize: 8, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.3 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  emptyStateSubtext: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
});
