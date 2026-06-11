import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  Image, Modal, Pressable, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchMyMembership } from '../../services/membershipService';
import { useAuthStore } from '../../store/authStore';
import { uploadProfilePhoto, removeProfilePhoto } from '../../services/profileService';
import { requestAccountDeletion } from '../../services/customerProfileService';

// Static achievements — UI only (no data / no navigation).
const ACHIEVEMENTS = [
  { name: 'First Blood',  xp: '+150 XP',  icon: 'trophy',       rare: true },
  { name: 'Iron Week',    xp: '+300 XP',  icon: 'flame' },
  { name: 'Century Club', xp: '+1000 XP', icon: 'ribbon' },
  { name: 'Max Power',    xp: '+500 XP',  icon: 'lock-closed',  locked: true },
];

// Profile menu — each row's accent tint.
const MENU = [
  { id: 'membership', label: 'Membership Details', sub: 'Manage your subscription',    icon: 'card-outline',          nav: 'Membership',   color: '#C8A2FF', bg: 'rgba(127,41,130,0.18)' },
  { id: 'orders',     label: 'Order History',      sub: 'Past transactions & invoices', icon: 'receipt-outline',       nav: 'OrderHistory', color: '#2DD4BF', bg: 'rgba(45,212,191,0.14)' },
  { id: 'activity',   label: 'Activity Dashboard', sub: 'Club usage & stats',           icon: 'stats-chart-outline',   nav: 'Activity',     color: '#F5B041', bg: 'rgba(245,176,65,0.14)' },
  { id: 'settings',   label: 'Settings',           sub: 'Edit details and preferences', icon: 'settings-outline',      nav: 'EditProfile',  color: '#C7C4CC', bg: 'rgba(255,255,255,0.08)' },
  { id: 'support',    label: 'Support',            sub: '24/7 concierge assistance',    icon: 'headset-outline',       nav: 'Support',      color: '#60A5FA', bg: 'rgba(96,165,250,0.14)' },
  { id: 'complaint',  label: 'Register Complaint', sub: 'Feedback & issue reporting',   icon: 'alert-circle-outline',  nav: 'MyComplaints', color: '#F87171', bg: 'rgba(248,113,113,0.14)' },
];

const fmtMMYY = (raw) => {
  if (!raw) return '--/--';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '--/--';
  return `${String(d.getMonth() + 1).padStart(2, '0')} / ${String(d.getFullYear()).slice(-2)}`;
};

export default function ProfileScreen({ navigation }) {
  const user               = useAuthStore((s) => s.user);
  const logout             = useAuthStore((s) => s.logout);
  const updateProfilePhoto = useAuthStore((s) => s.updateProfilePhoto);
  const refreshUser        = useAuthStore((s) => s.refreshUser);

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Athlete';

  const [membershipData, setMembershipData] = useState(null);

  useEffect(() => {
    refreshUser(); // ensure latest profilePhotoUrl + name from server
    fetchMyMembership().then(setMembershipData).catch(() => setMembershipData(null));
  }, []);

  // ── Membership card data ──────────────────────────────────────────────────
  const m = membershipData;
  const active = m?.membership?.status === 'active';
  const tier = (m?.plan?.tier ?? m?.plan?.name ?? 'Member').toString().toUpperCase();
  const planName = (m?.plan?.name ?? m?.plan?.tier ?? 'Membership').toString().toUpperCase();
  const statusLabel = active
    ? `ACTIVE ${planName}`
    : (m?.membership?.status ? String(m.membership.status).toUpperCase() : 'NO ACTIVE PLAN');
  const expiry = fmtMMYY(m?.membership?.endDate);
  const sinceRaw = m?.membership?.startDate ?? m?.membership?.createdAt;
  const sinceYear = sinceRaw ? new Date(sinceRaw).getFullYear() : null;

  // Use persisted photo URL from auth store; fall back to null (shows initials)
  const profilePhoto = user?.profilePhotoUrl ?? null;

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [uploading,         setUploading]         = useState(false);

  const handlePickedImage = async (uri) => {
    setUploading(true);
    try {
      const { profilePhotoUrl } = await uploadProfilePhoto(uri);
      await updateProfilePhoto(profilePhotoUrl);
    } catch (err) {
      Alert.alert('Upload failed', err?.response?.data?.message || 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openCamera = async () => {
    setPhotoModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) await handlePickedImage(result.assets[0].uri);
  };

  const openGallery = async () => {
    setPhotoModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) await handlePickedImage(result.assets[0].uri);
  };

  const removePhoto = async () => {
    setPhotoModalVisible(false);
    try {
      await removeProfilePhoto();
      await updateProfilePhoto(null);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not remove photo. Please try again.');
    }
  };

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // AppNavigator's useEffect will detect isAuthenticated = false
          // and reset the stack to Login automatically.
        },
      },
    ]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete My Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your data will be scheduled for permanent deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await requestAccountDeletion();
                      await logout();
                    } catch (err) {
                      Alert.alert('Error', err?.response?.data?.message || 'Could not process your request. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => !uploading && setPhotoModalVisible(true)}
            activeOpacity={0.85}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{firstName.charAt(0)}</Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.cameraBadge}>
                <ActivityIndicator size={10} color={COLORS.primaryLight} />
              </View>
            ) : (
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{user?.fullName || firstName}</Text>
          <Text style={styles.subline}>
            {sinceYear ? `Member since ${sinceYear}` : 'Build Member'}
            {user?.displayId ? `   ·   ID: ${user.displayId}` : ''}
          </Text>
        </View>

        {/* Membership card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate(active ? 'Membership' : 'MembershipPlans')}
        >
          <LinearGradient
            colors={['#2A1640', '#0F2A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.memCard}
          >
            <View style={styles.memTopRow}>
              <View style={styles.memTier}>
                <Ionicons name="star" size={12} color="#F5B041" />
                <Text style={styles.memTierText}>{tier}</Text>
              </View>
              <Text style={styles.memAccess}>PRIVATE ACCESS</Text>
            </View>

            <View style={styles.memChip} />

            <Text style={styles.memName}>{user?.fullName || firstName}</Text>

            <View style={styles.memBottomRow}>
              <View>
                <Text style={styles.memMetaLabel}>MEMBERSHIP STATUS</Text>
                <Text style={styles.memMetaValue}>{statusLabel}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.memMetaLabel}>EXPIRY</Text>
                <Text style={[styles.memMetaValue, { color: '#F5B041' }]}>{expiry}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Achievements (UI only) */}
        <View style={styles.achHeader}>
          <Text style={styles.achTitle}>ACHIEVEMENTS</Text>
          <Text style={styles.achXp}>2,480 XP</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achRow}
        >
          {ACHIEVEMENTS.map((a) => (
            <View key={a.name} style={[styles.achCard, a.locked && styles.achCardLocked]}>
              {a.rare && (
                <View style={styles.rareBadge}><Text style={styles.rareText}>RARE</Text></View>
              )}
              <View style={[styles.achIcon, a.locked && styles.achIconLocked]}>
                <Ionicons name={a.icon} size={22} color={a.locked ? COLORS.textMuted : '#F5B041'} />
              </View>
              <Text style={[styles.achName, a.locked && { color: COLORS.textMuted }]}>{a.name}</Text>
              <Text style={styles.achCardXp}>{a.xp}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Menu items */}
        <View style={styles.menuList}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.nav)}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={15} color="#F87171" />
          <Text style={styles.deleteText}>Delete My Account</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Profile Photo Modal ── */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <Pressable style={styles.photoOverlay} onPress={() => setPhotoModalVisible(false)}>
          <Pressable style={styles.photoSheet} onPress={() => {}}>
            <View style={styles.photoHandle} />

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
              ) : (
                <View style={[styles.photoPreview, styles.avatarFallback, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.avatarLetter}>{firstName.charAt(0)}</Text>
                </View>
              )}
            </View>

            <Text style={styles.photoTitle}>Profile Photo</Text>
            <Text style={styles.photoSub}>Choose how you’d like to update your photo</Text>

            <TouchableOpacity style={styles.photoOption} onPress={openCamera} activeOpacity={0.8}>
              <View style={styles.photoOptionIcon}>
                <Ionicons name="camera" size={20} color={COLORS.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionLabel}>Take Photo</Text>
                <Text style={styles.photoOptionSub}>Use your camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOption} onPress={openGallery} activeOpacity={0.8}>
              <View style={styles.photoOptionIcon}>
                <Ionicons name="images" size={20} color={COLORS.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionLabel}>Choose from Library</Text>
                <Text style={styles.photoOptionSub}>Pick from your gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {profilePhoto && (
              <TouchableOpacity style={[styles.photoOption, styles.photoOptionDanger]} onPress={removePhoto} activeOpacity={0.8}>
                <View style={[styles.photoOptionIcon, { backgroundColor: 'rgba(248,113,113,0.14)' }]}>
                  <Ionicons name="trash-outline" size={20} color="#F87171" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.photoOptionLabel, { color: '#F87171' }]}>Remove Photo</Text>
                  <Text style={styles.photoOptionSub}>Revert to default avatar</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.photoCancel}
              onPress={() => setPhotoModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.photoCancelText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', marginTop: 8, marginBottom: 22 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 92, height: 92, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: FONTS.display, fontSize: 38, color: COLORS.white },
  cameraBadge: {
    position: 'absolute', bottom: -4, right: -4, width: 30, height: 30,
    borderRadius: 15, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: FONTS.headline, fontSize: 26, color: COLORS.white, marginBottom: 6 },
  subline: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.textMuted, letterSpacing: 1 },

  // Membership card
  memCard: {
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(245,176,65,0.4)',
    padding: 20, marginBottom: 28, overflow: 'hidden',
  },
  memTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memTier: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memTierText: { fontFamily: FONTS.label, fontSize: 11, color: '#F5B041', letterSpacing: 2 },
  memAccess: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  memChip: {
    width: 38, height: 28, borderRadius: 6, backgroundColor: '#8a6d3b',
    marginTop: 22, marginBottom: 14, opacity: 0.85,
  },
  memName: { fontFamily: FONTS.headline, fontSize: 22, color: COLORS.white, letterSpacing: 1, marginBottom: 20 },
  memBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  memMetaLabel: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  memMetaValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white, letterSpacing: 0.5 },

  // Achievements
  achHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  achTitle: { fontFamily: FONTS.headline, fontSize: 15, color: COLORS.textPrimary, letterSpacing: 1.5 },
  achXp: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.cyanNeon },
  achRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  achCard: {
    width: 116, backgroundColor: COLORS.surface2, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center',
  },
  achCardLocked: { opacity: 0.55 },
  rareBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(245,176,65,0.18)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  rareText: { fontFamily: FONTS.label, fontSize: 8, color: '#F5B041', letterSpacing: 1 },
  achIcon: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(245,176,65,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, marginTop: 6,
  },
  achIconLocked: { backgroundColor: 'rgba(255,255,255,0.05)' },
  achName: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.white, marginBottom: 2, textAlign: 'center' },
  achCardXp: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.primaryLight },

  // Menu
  menuList: { gap: 10, marginBottom: 24, marginTop: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  menuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, marginBottom: 2 },
  menuSub: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },

  // Logout / delete
  logoutBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 4 },
  logoutText: { fontFamily: FONTS.label, fontSize: 13, color: COLORS.textSecondary, letterSpacing: 3 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10,
  },
  deleteText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#F87171', opacity: 0.8 },

  // Photo picker modal
  photoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  photoSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  photoHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20,
  },
  photoPreview: {
    width: 80, height: 80, borderRadius: 20,
    borderWidth: 3, borderColor: COLORS.primary, backgroundColor: COLORS.primary,
  },
  photoTitle: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white, textAlign: 'center', marginBottom: 4 },
  photoSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  photoOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.backgroundAlt, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
  },
  photoOptionDanger: { borderColor: 'rgba(248,113,113,0.3)' },
  photoOptionIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  photoOptionLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white, marginBottom: 2 },
  photoOptionSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  photoCancel: {
    marginTop: 4, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.backgroundAlt, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  photoCancelText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textSecondary },
});
