import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getMyComplaints } from '../../services/complaintService';
import SafeBottomBar from '../../components/SafeBottomBar';

const PAGE_SIZE = 15;

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: COLORS.warning },
  in_progress: { label: 'In Progress', color: COLORS.secondary },
  resolved:    { label: 'Resolved',    color: COLORS.success },
};

const FILTERS = [
  { key: 'All',         label: 'All' },
  { key: 'open',        label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',    label: 'Resolved' },
];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function MyComplaintsScreen({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [filter,     setFilter]     = useState('All');
  const [loading,    setLoading]    = useState(true);   // first-page spinner
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false); // footer spinner
  const [error,      setError]      = useState(null);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);

  const fetchPage = useCallback(async (pageNum, mode = 'fresh') => {
    if (mode === 'more')    setLoadingMore(true);
    else if (mode === 'refresh') setRefreshing(true);
    else                   setLoading(true);
    setError(null);
    try {
      const response = await getMyComplaints({ page: pageNum, limit: PAGE_SIZE });
      const data = response.data.data || [];
      const pag  = response.data.pagination ?? {};
      setHasMore(pag.hasMore ?? false);
      setComplaints(prev => (mode === 'more') ? [...prev, ...data] : data);
      setPage(pageNum);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchPage(1, 'fresh'); }, [fetchPage]);

  const handleRefresh = useCallback(() => fetchPage(1, 'refresh'), [fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    fetchPage(page + 1, 'more');
  }, [loadingMore, hasMore, loading, page, fetchPage]);

  const displayed = filter === 'All'
    ? complaints
    : complaints.filter((c) => c.status === filter);

  // Footer: loading-more spinner or end-of-list label
  const ListFooter = loadingMore
    ? <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 20 }} />
    : !hasMore && complaints.length >= PAGE_SIZE
      ? <Text style={styles.endText}>— All {complaints.length} complaints loaded —</Text>
      : null;

  // ── Render helpers ──────────────────────────────────────────────────────────

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderCard({ item }) {
    const statusCfg = STATUS_CONFIG[item.status] || { label: item.status, color: COLORS.textMuted };
    return (
      <TouchableOpacity
        style={[styles.card, item.escalated && styles.cardEscalated]}
        activeOpacity={0.82}
        onPress={() => navigation.navigate('MyComplaintDetail', { complaintId: item.id })}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <Text style={styles.ref}>{item.ref}</Text>
          {item.escalated && (
            <View style={[styles.badge, { borderColor: COLORS.error + '80', backgroundColor: COLORS.errorLight }]}>
              <Text style={[styles.badgeText, { color: COLORS.error }]}>⚠ ESCALATED</Text>
            </View>
          )}
          <View style={[styles.badge, { borderColor: statusCfg.color + '80', backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label.toUpperCase()}</Text>
          </View>
        </View>

        {/* Category chip */}
        <View style={styles.catChipRow}>
          <View style={styles.catChip}>
            <Text style={styles.catChipText}>{item.category}</Text>
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.date}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} /> {formatDate(item.createdAt)}
        </Text>

        {/* Chevron */}
        <View style={styles.chevronRow}>
          <Text style={styles.viewDetail}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.secondary} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPage(1, 'fresh')}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={ListFooter}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={10}
        initialNumToRender={PAGE_SIZE}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No complaints found</Text>
            <Text style={styles.emptySub}>
              {filter === 'All'
                ? "You haven't submitted any complaints yet."
                : `No ${STATUS_CONFIG[filter]?.label?.toLowerCase() ?? filter} complaints.`}
            </Text>
          </View>
        }
      />
    </SafeBottomBar>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  centered:   { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  chip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive:     { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  chipText:       { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  chipTextActive: { color: COLORS.secondary },
  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16, gap: 8,
  },
  cardEscalated: { borderColor: COLORS.error + '60', backgroundColor: 'rgba(255,68,68,0.04)' },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ref:        { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', flex: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  catChipRow: { flexDirection: 'row' },
  catChip: {
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catChipText: { color: COLORS.secondary, fontSize: 10, fontWeight: '800' },
  desc:   { color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  date:   { color: COLORS.textMuted, fontSize: 11 },
  chevronRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewDetail:   { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  emptyBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, gap: 10,
  },
  emptyTitle: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '700' },
  emptySub:   { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  errorText:  { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    marginTop: 4, backgroundColor: COLORS.secondaryGlow, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryBtnText: { color: COLORS.secondary, fontWeight: '800', fontSize: 13 },
  endText: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 20 },
});
