import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { resumeMembershipPause } from '../../services/membershipService';
import { callAdmin } from '../../services/notificationService';
import { useMembershipStore } from '../../store/membershipStore';
import { useAuthStore } from '../../store/authStore';

/**
 * FrozenLockScreen — full-app static lock shown whenever the member's
 * membership.status === 'frozen'. No other navigation is reachable (v1 hard lock).
 *
 * - Member-initiated freeze (pause): shows a "Resume membership" button that
 *   ends the pause immediately, then refreshes status to unlock the app.
 * - Admin-initiated freeze: shows a "Call the gym" action only.
 *
 * NOTE (future): the sheet wants a later version to gray-out buttons instead of
 * a hard lock — that swap happens at the navigation root (MembershipGate), this
 * screen stays the v1 lock.
 */
export default function FrozenLockScreen() {
  const currentPause = useMembershipStore((s) => s.currentPause);
  const refresh      = useMembershipStore((s) => s.refresh);
  const logout       = useAuthStore((s) => s.logout);
  const [resuming, setResuming] = useState(false);

  const selfInitiated = currentPause?.initiatedByRole === 'member';

  const handleResume = async () => {
    if (!currentPause?.id) return;
    setResuming(true);
    try {
      await resumeMembershipPause(currentPause.id);
      await refresh(); // flips the gate back to the app once status is 'active'
    } catch (err) {
      Alert.alert('Could not resume', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setResuming(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={s.body}>
        <View style={s.iconWrap}>
          <Ionicons name="snow-outline" size={56} color={COLORS.orange} />
        </View>

        <Text style={s.title}>Membership Frozen</Text>
        <Text style={s.message}>
          {selfInitiated
            ? 'Your membership is currently paused. Resume it any time to get back into the app.'
            : 'Your access is currently frozen. Please contact the gym for assistance.'}
        </Text>

        {selfInitiated ? (
          <TouchableOpacity
            style={[s.primaryBtn, resuming && s.btnBusy]}
            onPress={handleResume}
            disabled={resuming}
            activeOpacity={0.85}
          >
            {resuming
              ? <ActivityIndicator color={COLORS.white} />
              : <>
                  <Ionicons name="play-circle-outline" size={18} color={COLORS.white} />
                  <Text style={s.primaryBtnText}>Resume Membership</Text>
                </>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.primaryBtn} onPress={callAdmin} activeOpacity={0.85}>
            <Ionicons name="call-outline" size={18} color={COLORS.white} />
            <Text style={s.primaryBtnText}>Call the Gym</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: COLORS.orangeBorder, marginBottom: 28,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  message: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 36 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.orange, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28,
    width: '100%',
  },
  btnBusy: { opacity: 0.7 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  logoutBtn: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 16 },
  logoutText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
});
