import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getComplaintById } from '../../services/complaintService';

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: COLORS.warning },
  in_progress: { label: 'In Progress', color: COLORS.secondary },
  resolved:    { label: 'Resolved',    color: COLORS.success },
};

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function MyComplaintDetailScreen({ navigation, route }) {
  const { complaintId } = route.params;

  const [complaint, setComplaint] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await getComplaintById(complaintId);
        setComplaint(response.data.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load complaint.');
      } finally {
        setLoading(false);
      }
    })();
  }, [complaintId]);

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (error || !complaint) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error || 'Complaint not found.'}</Text>
        <TouchableOpacity style={styles.backBtn2} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn2Text}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const statusCfg = STATUS_CONFIG[complaint.status] || { label: complaint.status, color: COLORS.textMuted };

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerRef}>{complaint.ref}</Text>
          <Text style={styles.headerSub}>Ticket Detail</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Status + Escalation badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { borderColor: statusCfg.color + '80', backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label.toUpperCase()}</Text>
          </View>
          {complaint.escalated && (
            <View style={[styles.badge, { borderColor: COLORS.error + '80', backgroundColor: COLORS.errorLight }]}>
              <Text style={[styles.badgeText, { color: COLORS.error }]}>⚠ ESCALATED</Text>
            </View>
          )}
          {/* Category */}
          <View style={styles.catChip}>
            <Text style={styles.catChipText}>{complaint.category}</Text>
          </View>
        </View>

        {/* Filed date */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>Filed on {formatDate(complaint.createdAt)}</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESCRIPTION</Text>
          <Text style={styles.descText}>{complaint.description}</Text>
        </View>

        {/* Image Attachments */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ATTACHMENTS</Text>
          {complaint.imageUrls && complaint.imageUrls.length > 0 ? (
            <View style={styles.imagesGrid}>
              {/* Thumbnail grid — will render real images once upload is live */}
              {complaint.imageUrls.map((url, i) => (
                <View key={i} style={styles.imagePlaceholder}>
                  <Ionicons name="image" size={28} color={COLORS.textMuted} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noImagesBox}>
              <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.noImagesText}>No images attached</Text>
            </View>
          )}
        </View>

        {/* Resolution Notes — only when resolved */}
        {complaint.status === 'resolved' && complaint.resolutionNotes ? (
          <View style={[styles.section, styles.resolutionBox]}>
            <View style={styles.resolutionHeader}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={[styles.sectionLabel, { color: COLORS.success, marginBottom: 0 }]}>RESOLUTION NOTES</Text>
            </View>
            <Text style={styles.resolutionText}>{complaint.resolutionNotes}</Text>
            {complaint.resolvedAt && (
              <Text style={styles.resolvedAt}>Resolved on {formatDate(complaint.resolvedAt)}</Text>
            )}
          </View>
        ) : null}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIMELINE</Text>
          <View style={styles.timeline}>
            <TimelineRow icon="document-text-outline" color={COLORS.secondary} label="Submitted" date={formatDate(complaint.createdAt)} />
            {complaint.escalatedAt && (
              <TimelineRow icon="alert-circle-outline" color={COLORS.error} label="Escalated" date={formatDate(complaint.escalatedAt)} />
            )}
            {complaint.resolvedAt && (
              <TimelineRow icon="checkmark-circle-outline" color={COLORS.success} label="Resolved" date={formatDate(complaint.resolvedAt)} />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineRow({ icon, color, label, date }) {
  return (
    <View style={tlStyles.row}>
      <View style={[tlStyles.dot, { borderColor: color }]}>
        <Ionicons name={icon} size={12} color={color} />
      </View>
      <View style={tlStyles.content}>
        <Text style={[tlStyles.label, { color }]}>{label}</Text>
        <Text style={tlStyles.date}>{date}</Text>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerRef: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  body:      { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },
  badgeRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  catChip: {
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catChipText: { color: COLORS.secondary, fontSize: 10, fontWeight: '800' },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: COLORS.textMuted, fontSize: 12 },
  section:  { gap: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: COLORS.secondary,
    letterSpacing: 2, marginBottom: 2,
  },
  descText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imagePlaceholder: {
    width: 80, height: 80, borderRadius: 10,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  noImagesBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16,
  },
  noImagesText: { color: COLORS.textMuted, fontSize: 13 },
  resolutionBox: {
    backgroundColor: 'rgba(76,175,80,0.06)', borderWidth: 1,
    borderColor: COLORS.success + '40', borderRadius: 14, padding: 14,
  },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolutionText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  resolvedAt:     { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  timeline: { gap: 12 },
  errorText:    { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  backBtn2: {
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4,
  },
  backBtn2Text: { color: COLORS.secondary, fontWeight: '800', fontSize: 13 },
});

const tlStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  content: { flex: 1, paddingTop: 3 },
  label:   { fontSize: 13, fontWeight: '700' },
  date:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
