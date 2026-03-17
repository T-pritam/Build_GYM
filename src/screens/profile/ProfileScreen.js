import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  Image, Modal, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { currentUser, membership, buildCoins } from '../../constants/dummyData';
import { useAuthStore } from '../../store/authStore';

const MENU = [
  {
    id: 'membership', label: 'Membership Details', icon: 'card-outline',
    sub: 'ELITE · 128 days left', nav: 'Membership', color: COLORS.secondary, bg: COLORS.secondaryGlow,
  },
  {
    id: 'activity', label: 'Activity Dashboard', icon: 'bar-chart-outline',
    sub: '18 visits this month · 5-day streak', nav: 'Activity', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'personal', label: 'Personal Details', icon: 'person-outline',
    sub: currentUser?.email || 'arjun.sharma@email.com', nav: null, color: '#A855F7', bg: 'rgba(168,85,247,0.12)',
  },
  {
    id: 'complaint', label: 'Register Complaint', icon: 'alert-circle-outline',
    sub: 'Report an issue', nav: 'Complaint', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'health', label: 'Health & Emergency Info', icon: 'heart-outline',
    sub: 'Medical & contact details', nav: null, color: '#22C55E', bg: 'rgba(34,197,94,0.12)',
  },
];

export default function ProfileScreen({ navigation }) {
  const firstName = currentUser?.name?.split(' ')[0] || 'Arjun';
  const balance = buildCoins?.balance || 2450;
  const earned  = buildCoins?.totalEarned || 5000;
  const spent   = buildCoins?.totalSpent || 2550;

  const [profilePhoto,      setProfilePhoto]      = useState(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

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
    if (!result.canceled) setProfilePhoto(result.assets[0].uri);
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
    if (!result.canceled) setProfilePhoto(result.assets[0].uri);
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoModalVisible(false);
  };

  const logout = useAuthStore((s) => s.logout);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setPhotoModalVisible(true)}
            activeOpacity={0.85}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{firstName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{currentUser?.name || 'Arjun Sharma'}</Text>
          <Text style={styles.phone}>{currentUser?.mobile || '+91 98765 43210'}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>★ Member since {currentUser?.memberSince || 'Jan 2024'}</Text>
          </View>
        </View>

        {/* Build Coins card */}
        <View style={styles.coinsCard}>
          <View style={styles.coinsTop}>
            <Text style={styles.coinsCardLabel}>Build Coins Balance</Text>
            <TouchableOpacity
              style={styles.requestBtn}
              onPress={() => navigation.navigate('BuildCoinTransactions')}
            >
              <Text style={styles.requestBtnText}>+ Request</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coinsBalance}>₿ {balance.toLocaleString('en-IN')}</Text>
          <View style={styles.coinsDivider} />
          <View style={styles.coinsStats}>
            <View style={styles.coinsStat}>
              <Text style={[styles.coinsStatNum, { color: '#22C55E' }]}>{earned.toLocaleString()}</Text>
              <Text style={styles.coinsStatLabel}>Total Earned</Text>
            </View>
            <View style={styles.coinsStatBorder} />
            <View style={styles.coinsStat}>
              <Text style={[styles.coinsStatNum, { color: '#EF4444' }]}>{spent.toLocaleString()}</Text>
              <Text style={styles.coinsStatLabel}>Total Spent</Text>
            </View>
            <View style={styles.coinsStatBorder} />
            <View style={styles.coinsStat}>
              <Text style={[styles.coinsStatNum, { color: '#3B82F6' }]}>{balance.toLocaleString()}</Text>
              <Text style={styles.coinsStatLabel}>Available</Text>
            </View>
          </View>
        </View>

        {/* Membership active */}
        <View style={styles.memActive}>
          <View style={styles.memActiveLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.memActiveText}>
              {membership?.type || 'ELITE'} membership — Active
            </Text>
          </View>
          <Text style={styles.memDaysLeft}>{membership?.daysLeft || 128} days left</Text>
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => item.nav ? navigation.navigate(item.nav) : {}}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
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
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
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
                <View style={[styles.photoPreview, styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.avatarLetter}>{firstName.charAt(0)}</Text>
                </View>
              )}
            </View>

            <Text style={styles.photoTitle}>Profile Photo</Text>
            <Text style={styles.photoSub}>Choose how you’d like to update your photo</Text>

            <TouchableOpacity style={styles.photoOption} onPress={openCamera} activeOpacity={0.8}>
              <View style={styles.photoOptionIcon}>
                <Ionicons name="camera" size={20} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionLabel}>Take Photo</Text>
                <Text style={styles.photoOptionSub}>Use your camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOption} onPress={openGallery} activeOpacity={0.8}>
              <View style={styles.photoOptionIcon}>
                <Ionicons name="images" size={20} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionLabel}>Choose from Library</Text>
                <Text style={styles.photoOptionSub}>Pick from your gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {profilePhoto && (
              <TouchableOpacity style={[styles.photoOption, styles.photoOptionDanger]} onPress={removePhoto} activeOpacity={0.8}>
                <View style={[styles.photoOptionIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.photoOptionLabel, { color: '#EF4444' }]}>Remove Photo</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    backgroundColor: 'rgba(233,99,22,0.06)',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96, height: 96, borderRadius: 16, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  avatarLetter: { fontSize: 40, fontWeight: '900', color: '#fff' },
  cameraBadge: {
    position: 'absolute', bottom: -4, right: -4, width: 32, height: 32,
    borderRadius: 16, backgroundColor: '#2A2A2A', borderWidth: 2, borderColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  phone: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  memberBadge: {
    borderWidth: 1, borderColor: COLORS.secondary + '66', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  memberBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 1 },

  // Coins card
  coinsCard: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1, borderColor: '#333',
    padding: 20, marginBottom: 12,
  },
  coinsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  coinsCardLabel: { fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 2, textTransform: 'uppercase' },
  requestBtn: { borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  requestBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  coinsBalance: { fontSize: 36, fontWeight: '900', color: '#fff', lineHeight: 40, marginBottom: 20 },
  coinsDivider: { height: 1, backgroundColor: '#333', marginBottom: 16 },
  coinsStats: { flexDirection: 'row' },
  coinsStat: { flex: 1 },
  coinsStatNum: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  coinsStatLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  coinsStatBorder: { width: 1, backgroundColor: '#333', marginHorizontal: 8 },

  // Membership active
  memActive: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333',
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  memActiveLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greenDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 5,
  },
  memActiveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  memDaysLeft: { fontSize: 13, fontWeight: '800', color: COLORS.secondary },

  // Menu
  menuList: { gap: 10, marginBottom: 24 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333', padding: 16,
  },
  menuIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  menuSub: { fontSize: 11, color: COLORS.textMuted },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#EF444444', borderRadius: 14, padding: 14,
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  // Photo picker modal
  photoOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  photoSheet: {
    backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 4, borderWidth: 1, borderColor: '#333',
  },
  photoHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#444', marginBottom: 20,
  },
  photoPreview: {
    width: 80, height: 80, borderRadius: 20,
    borderWidth: 3, borderColor: COLORS.secondary, backgroundColor: COLORS.secondary,
  },
  photoTitle:   { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  photoSub:     { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  photoOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#111', borderRadius: 14, borderWidth: 1, borderColor: '#333',
    padding: 14, marginBottom: 10,
  },
  photoOptionDanger: { borderColor: 'rgba(239,68,68,0.3)' },
  photoOptionIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(233,99,22,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoOptionLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  photoOptionSub:   { fontSize: 12, color: COLORS.textMuted },
  photoCancel: {
    marginTop: 4, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#333', alignItems: 'center',
  },
  photoCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
});
