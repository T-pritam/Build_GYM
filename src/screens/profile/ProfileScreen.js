import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  currentUser,
  membership,
  buildCoins,
  membershipOffers,
} from '../../constants/dummyData';

export default function ProfileScreen({ navigation }) {
  const [profilePhoto, setProfilePhoto] = useState(null);
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

  const menuItems = [
    {
      id: 'membership',
      label: 'Membership Details',
      icon: 'card-outline',
      sub: `${membership.type} · ${membership.daysLeft} days left`,
      onPress: () => navigation.navigate('Membership'),
      color: COLORS.secondary,
    },
    {
      id: 'activity',
      label: 'Activity Dashboard',
      icon: 'bar-chart-outline',
      sub: '18 visits this month · 5-day streak',
      onPress: () => navigation.navigate('Activity'),
      color: '#2196F3',
    },
    {
      id: 'personal',
      label: 'Personal Details',
      icon: 'person-outline',
      sub: currentUser.email || currentUser.mobile,
      onPress: () => {},
      color: '#9C27B0',
    },
    {
      id: 'complaint',
      label: 'Register Complaint',
      icon: 'alert-circle-outline',
      sub: 'Report an issue with equipment, staff, etc.',
      onPress: () => navigation.navigate('Complaint'),
      color: COLORS.error,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline',
      sub: '2 unread',
      onPress: () => navigation.navigate('Notifications'),
      color: '#FF9800',
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Build Gym?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => navigation.replace('Login') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header gradient */}
        <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.headerGradient}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>

          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrap} onPress={() => setPhotoModalVisible(true)} activeOpacity={0.85}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarPhoto} />
              ) : (
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{currentUser.name.charAt(0)}</Text>
                </LinearGradient>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <Text style={styles.userPhone}>{currentUser.mobile}</Text>
            <View style={styles.memberSinceBadge}>
              <Ionicons name="star" size={11} color={COLORS.secondary} />
              <Text style={styles.memberSince}>Member since {currentUser.memberSince}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Build Coins card */}
        <View style={styles.coinsCard}>
          <LinearGradient
            colors={['#2A1200', '#1A0A00']}
            style={styles.coinsCardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.coinsTop}>
              <View>
                <Text style={styles.coinsLabel}>BUILD COINS BALANCE</Text>
                <View style={styles.coinsRow}>
                  <MaterialCommunityIcons name="bitcoin" size={28} color={COLORS.secondary} />
                  <Text style={styles.coinsNum}>{buildCoins.balance.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.addCoinsBtn}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  style={styles.addCoinsBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add" size={16} color={COLORS.white} />
                  <Text style={styles.addCoinsBtnText}>Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.coinStats}>
              <View style={styles.coinStat}>
                <Text style={styles.coinStatNum}>{buildCoins.totalEarned.toLocaleString()}</Text>
                <Text style={styles.coinStatLabel}>Total Earned</Text>
              </View>
              <View style={styles.coinStatDivider} />
              <View style={styles.coinStat}>
                <Text style={[styles.coinStatNum, { color: COLORS.error }]}>
                  {buildCoins.totalSpent.toLocaleString()}
                </Text>
                <Text style={styles.coinStatLabel}>Total Spent</Text>
              </View>
              <View style={styles.coinStatDivider} />
              <View style={styles.coinStat}>
                <Text style={[styles.coinStatNum, { color: COLORS.success }]}>
                  {buildCoins.balance.toLocaleString()}
                </Text>
                <Text style={styles.coinStatLabel}>Available</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Membership status mini banner */}
        <View style={styles.memBanner}>
          <View style={styles.memBannerLeft}>
            <View style={[styles.memStatusDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.memBannerText}>
              <Text style={styles.memBannerHL}>{membership.type}</Text> membership – Active
            </Text>
          </View>
          <Text style={styles.memBannerExpiry}>{membership.daysLeft} days left</Text>
        </View>

        {/* Menu items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Offers */}
        <View style={styles.offersSection}>
          <Text style={styles.offersSectionTitle}>Membership Offers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersScroll}>
            {membershipOffers.map((offer) => (
              <TouchableOpacity key={offer.id} style={styles.offerCard} activeOpacity={0.85}>
                <LinearGradient
                  colors={[`${offer.color}22`, `${offer.color}08`]}
                  style={styles.offerCardInner}
                >
                  <View style={[styles.offerBadge, { backgroundColor: offer.color }]}>
                    <Text style={styles.offerBadgeText}>{offer.badge}</Text>
                  </View>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerSub}>{offer.subtitle}</Text>
                  <Text style={styles.offerCta}>Contact Reception →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.appVersion}>Build Gym App v1.0.0 · Phase 1</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── PROFILE PHOTO MODAL ── */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <Pressable style={styles.photoModalOverlay} onPress={() => setPhotoModalVisible(false)}>
          <Pressable style={styles.photoModalSheet} onPress={() => {}}>
            <View style={styles.photoModalHandle} />

            {/* Avatar preview */}
            <View style={styles.photoModalAvatar}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.photoModalAvatarImg} />
              ) : (
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  style={styles.photoModalAvatarGrad}
                >
                  <Text style={styles.photoModalAvatarText}>{currentUser.name.charAt(0)}</Text>
                </LinearGradient>
              )}
            </View>

            <Text style={styles.photoModalTitle}>Profile Photo</Text>
            <Text style={styles.photoModalSub}>Choose how you'd like to update your photo</Text>

            {/* Options */}
            <TouchableOpacity style={styles.photoModalOption} onPress={openCamera} activeOpacity={0.8}>
              <View style={styles.photoModalOptionIcon}>
                <Ionicons name="camera" size={20} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoModalOptionLabel}>Take Photo</Text>
                <Text style={styles.photoModalOptionSub}>Use your camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoModalOption} onPress={openGallery} activeOpacity={0.8}>
              <View style={styles.photoModalOptionIcon}>
                <Ionicons name="images" size={20} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoModalOptionLabel}>Choose from Library</Text>
                <Text style={styles.photoModalOptionSub}>Pick from your gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
            </TouchableOpacity>

            {profilePhoto && (
              <TouchableOpacity style={[styles.photoModalOption, styles.photoModalOptionDanger]} onPress={removePhoto} activeOpacity={0.8}>
                <View style={[styles.photoModalOptionIcon, { backgroundColor: `${COLORS.error}18` }]}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.photoModalOptionLabel, { color: COLORS.error }]}>Remove Photo</Text>
                  <Text style={styles.photoModalOptionSub}>Revert to default avatar</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.photoModalCancel}
              onPress={() => setPhotoModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.photoModalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {},

  // Header
  headerGradient: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 32 },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20,
  },
  // Avatar
  avatarSection: { alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
  },
  avatarPhoto: {
    width: 88, height: 88, borderRadius: 26,
    borderWidth: 3, borderColor: COLORS.secondary,
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: COLORS.white },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.white, marginBottom: 4 },
  userPhone: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  memberSinceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.secondaryGlow,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  memberSince: { fontSize: 11, color: COLORS.secondary, fontWeight: '700' },

  // Coins card
  coinsCard: { marginHorizontal: 20, marginTop: -10, borderRadius: 20, overflow: 'hidden', elevation: 4 },
  coinsCardInner: {
    padding: 20, borderWidth: 1, borderColor: '#3A1A00',
  },
  coinsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  coinsLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinsNum: { fontSize: 34, fontWeight: '900', color: COLORS.white },
  addCoinsBtn: { borderRadius: 10, overflow: 'hidden' },
  addCoinsBtnGradient: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 4, alignItems: 'center' },
  addCoinsBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  coinStats: { flexDirection: 'row', justifyContent: 'space-around' },
  coinStat: { alignItems: 'center' },
  coinStatNum: { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  coinStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  coinStatDivider: { width: 1, backgroundColor: COLORS.border },

  // Membership banner
  memBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginTop: 14, backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12,
  },
  memBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memStatusDot: { width: 8, height: 8, borderRadius: 4 },
  memBannerText: { fontSize: 13, color: COLORS.textSecondary },
  memBannerHL: { color: COLORS.white, fontWeight: '700' },
  memBannerExpiry: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  // Menu
  menuSection: { paddingHorizontal: 20, marginTop: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10, gap: 14,
  },
  menuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  menuSub: { fontSize: 12, color: COLORS.textMuted },

  // Offers
  offersSection: { marginTop: 24, paddingLeft: 20 },
  offersSectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 14, paddingRight: 20 },
  offersScroll: { paddingRight: 20, gap: 12 },
  offerCard: { width: 200, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  offerCardInner: { padding: 16 },
  offerBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  offerBadgeText: { fontSize: 10, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  offerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 6 },
  offerSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 12 },
  offerCta: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 28, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: `${COLORS.error}44`, gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.error },

  // App version
  appVersion: { textAlign: 'center', fontSize: 11, color: COLORS.textDim, marginTop: 16 },

  // Photo picker modal
  photoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  photoModalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  photoModalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 20,
  },
  photoModalAvatar: { alignItems: 'center', marginBottom: 16 },
  photoModalAvatarImg: { width: 80, height: 80, borderRadius: 24, borderWidth: 3, borderColor: COLORS.secondary },
  photoModalAvatarGrad: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  photoModalAvatarText: { fontSize: 34, fontWeight: '900', color: COLORS.white },
  photoModalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.white, textAlign: 'center', marginBottom: 4 },
  photoModalSub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  photoModalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.background, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10,
  },
  photoModalOptionDanger: { borderColor: `${COLORS.error}30` },
  photoModalOptionIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  photoModalOptionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  photoModalOptionSub: { fontSize: 12, color: COLORS.textMuted },
  photoModalCancel: {
    marginTop: 4, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  photoModalCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
});
