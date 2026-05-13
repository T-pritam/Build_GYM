import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { autoUnlock } from '../../services/bleService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { membership } from '../../constants/dummyData';
import { useAuthStore } from '../../store/authStore';

const ACCESS_MODES = [
  {
    id: 'gate',
    label: 'Gate Access',
    icon: 'door-open',
    ionIcon: 'enter-outline',
    desc: 'Open the main gym entrance gate via Bluetooth.',
    logText: 'Gate opened',
  },
  {
    id: 'locker',
    label: 'Locker',
    icon: 'lock-open-variant',
    ionIcon: 'lock-open-outline',
    desc: 'Unlock your assigned locker via Bluetooth.',
    logText: 'Locker #14 opened',
  },
];

export default function AccessScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState('gate');
  const [status, setStatus] = useState('idle'); // idle | scanning | success | denied
  const [memberPhoto, setMemberPhoto] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [logs, setLogs] = useState([
    { id: 1, text: 'Gate opened', time: '06:42 AM', type: 'success' },
    { id: 2, text: 'Locker #14 opened', time: '06:43 AM', type: 'success' },
  ]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseOpacity.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(pulseOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const handleAccess = async () => {
    if (membership.status !== 'ACTIVE') {
      setStatus('denied');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }
    setStatus('scanning');
    startPulse();
    try {
      const readerName = await autoUnlock(10);
      stopPulse();
      setStatus('success');
      const selectedMode = ACCESS_MODES.find((m) => m.id === mode);
      const now = new Date();
      const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setLogs((prev) => [
        { id: Date.now(), text: `${selectedMode.logText} via ${readerName}`, time, type: 'success' },
        ...prev.slice(0, 4),
      ]);
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      stopPulse();
      const code = err.code ?? err.message;
      if (code === 'PERMISSION_DENIED') {
        Alert.alert('Permission Required', 'Please allow Bluetooth access to unlock the door.');
      } else if (code === 'BT_NOT_ENABLED') {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to unlock the door.');
      } else if (code === 'NO_READERS_FOUND') {
        Alert.alert('No Reader Found', 'Move closer to the door and try again.');
      } else {
        Alert.alert('Access Failed', err.message ?? 'Could not unlock. Please try again.');
      }
      setStatus('idle');
    }
  };

  const getButtonColors = () => {
    if (status === 'success') return ['#1B5E20', '#4CAF50'];
    if (status === 'denied') return ['#7F0000', '#D32F2F'];
    if (status === 'scanning') return ['#1A0800', COLORS.secondaryDark];
    return [COLORS.secondaryDark, COLORS.secondary];
  };

  const getStatusMsg = () => {
    if (status === 'scanning') return 'Searching for reader...';
    if (status === 'success') return 'Access granted ✓';
    if (status === 'denied') return 'Access denied – inactive membership';
    return 'Tap to unlock';
  };

  const getStatusColor = () => {
    if (status === 'success') return COLORS.success;
    if (status === 'denied') return COLORS.error;
    if (status === 'scanning') return COLORS.secondary;
    return COLORS.textSecondary;
  };

  const handlePickPhoto = () => {
    Alert.alert(
      'Member Photo',
      'Choose how to add your photo',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission needed', 'Camera access is required to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) setMemberPhoto(result.assets[0].uri);
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission needed', 'Photo library access is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) setMemberPhoto(result.assets[0].uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove Photo', 'Remove your member photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMemberPhoto(null) },
    ]);
  };

  const displayName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Member';
  const photoUrl = memberPhoto || user?.profilePhotoUrl || null;
  const initials = displayName.charAt(0).toUpperCase();
  const shortId = user?.id ? user.id.split('-')[0].toUpperCase() : '------';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#1A0800', '#0D0D0D', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Access Control</Text>
        <View style={styles.blePill}>
          <View style={styles.bleDot} />
          <Text style={styles.bleText}>BLE Ready</Text>
        </View>
      </View>

      {/* Member photo card */}
      <View style={styles.memberCard}>
        <View style={styles.photoWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.memberPhoto} />
          ) : (
            <LinearGradient
              colors={[COLORS.secondaryDark, '#2A1200']}
              style={styles.memberPhotoPlaceholder}
            >
              <Text style={styles.memberPhotoInitial}>{initials}</Text>
            </LinearGradient>
          )}

        </View>
        <View style={styles.memberCardInfo}>
          <Text style={styles.memberCardName}>{displayName}</Text>
          <Text style={styles.memberCardId}>ID: {shortId}</Text>
          <View style={styles.memberCardBadge}>
            <View style={[styles.memStatusDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.memberCardBadgeText}>{membership.type} MEMBER</Text>
          </View>
        </View>
        {/* {!memberPhoto && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={15} color={COLORS.secondary} />
            <Text style={styles.addPhotoBtnText}>Add Photo</Text>
          </TouchableOpacity>
        )} */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode selector */}
        <View style={styles.modeRow}>
          {ACCESS_MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]}
              onPress={() => { if (status === 'idle') setMode(m.id); }}
            >
              <Ionicons
                name={m.ionIcon}
                size={20}
                color={mode === m.id ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.modeBtnText, mode === m.id && styles.modeBtnTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.modeDesc}>
          {ACCESS_MODES.find((m) => m.id === mode)?.desc}
        </Text>

        {/* Big access button */}
        <View style={styles.btnArea}>
          {/* Pulse ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
            ]}
          />

          <TouchableOpacity
            onPress={handleAccess}
            activeOpacity={0.85}
            disabled={status !== 'idle'}
            style={styles.accessBtnOuter}
          >
            <LinearGradient
              colors={getButtonColors()}
              style={styles.accessBtn}
            >
              {status === 'scanning' ? (
                <MaterialCommunityIcons name="bluetooth-audio" size={52} color={COLORS.white} />
              ) : status === 'success' ? (
                <Ionicons name="checkmark-circle" size={56} color={COLORS.white} />
              ) : status === 'denied' ? (
                <Ionicons name="close-circle" size={56} color={COLORS.white} />
              ) : mode === 'gate' ? (
                <Ionicons name="enter-outline" size={52} color={COLORS.white} />
              ) : (
                <Ionicons name="lock-open-outline" size={52} color={COLORS.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Status text */}
        <Text style={[styles.statusMsg, { color: getStatusColor() }]}>
          {getStatusMsg()}
        </Text>

        {/* Membership status */}
        <View style={[
          styles.memStatusBadge,
          membership.status === 'ACTIVE' ? styles.memActive : styles.memInactive
        ]}>
          <View style={[styles.memStatusDot, { backgroundColor: membership.status === 'ACTIVE' ? COLORS.success : COLORS.error }]} />
          <Text style={[styles.memStatusText, { color: membership.status === 'ACTIVE' ? COLORS.success : COLORS.error }]}>
            Membership: {membership.status}
          </Text>
          <Text style={styles.memExpiry}>· Valid till {new Date(membership.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
        </View>

        {/* Recent access log */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>Recent Access Log</Text>
          {logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={[styles.logDot, { backgroundColor: log.type === 'success' ? COLORS.success : COLORS.error }]} />
              <Text style={styles.logText}>{log.text}</Text>
              <Text style={styles.logTime}>{log.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  circle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,107,0,0.04)', top: -100, right: -100,
  },
  circle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,107,0,0.03)', bottom: 50, left: -80,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 8,
  },

  // Member photo card
  memberCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24,
    marginTop: 12, marginBottom: 4, backgroundColor: COLORS.surface,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 16,
  },
  photoWrap: { position: 'relative' },
  memberPhoto: { width: 62, height: 62, borderRadius: 18 },
  memberPhotoPlaceholder: {
    width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  memberPhotoInitial: { fontSize: 28, fontWeight: '900', color: COLORS.white },
  photoEditBtn: {
    position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  memberCardInfo: { flex: 1 },
  memberCardName: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 3 },
  memberCardId: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 6 },
  memberCardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: COLORS.secondaryGlow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  memberCardBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1 },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    backgroundColor: COLORS.secondaryGlow,
  },
  addPhotoBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.white },
  blePill: {
    flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(33,150,243,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.3)', gap: 6,
  },
  bleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2196F3' },
  bleText: { fontSize: 11, fontWeight: '700', color: '#2196F3' },

  scroll: { paddingBottom: 40 },

  // Mode selector
  modeRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginTop: 20, marginBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  modeBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  modeBtnTextActive: { color: COLORS.secondary },
  modeDesc: {
    fontSize: 13, color: COLORS.textMuted, textAlign: 'center',
    paddingHorizontal: 36, lineHeight: 18, marginBottom: 32,
  },

  // Big button
  btnArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pulseRing: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 2, borderColor: COLORS.secondary,
  },
  accessBtnOuter: { borderRadius: 90, overflow: 'hidden' },
  accessBtn: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
  },

  // Status
  statusMsg: { textAlign: 'center', fontSize: 15, fontWeight: '700', marginBottom: 20 },

  // Membership badge
  memStatusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6,
    marginBottom: 32, borderWidth: 1,
  },
  memActive: { backgroundColor: COLORS.successLight, borderColor: `${COLORS.success}44` },
  memInactive: { backgroundColor: COLORS.errorLight, borderColor: `${COLORS.error}44` },
  memStatusDot: { width: 8, height: 8, borderRadius: 4 },
  memStatusText: { fontSize: 13, fontWeight: '700' },
  memExpiry: { fontSize: 12, color: COLORS.textMuted },

  // Logs
  logSection: { paddingHorizontal: 24 },
  logTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5,
    marginBottom: 12, textTransform: 'uppercase',
  },
  logItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 8, gap: 10,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  logTime: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
