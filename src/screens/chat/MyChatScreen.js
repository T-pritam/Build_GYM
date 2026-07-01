/**
 * MyChatScreen — the member's coach chat entry point (resolver).
 * A trainee has at most ONE trainer, so there's no thread list: if an active
 * coaching thread exists we go straight into it; otherwise we show the
 * "No coach assigned yet" empty state.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../theme/colors';
import { useChatStore } from '../../store/chatStore';
import { RECEPTION_PHONE } from '../../services/notificationService';

export default function MyChatScreen({ navigation }) {
  const threads = useChatStore((s) => s.threads);
  const init = useChatStore((s) => s.init);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try { await init(); } catch (e) { /* keep cached threads */ }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [init]));

  const active = threads.find((t) => t.state !== 'archived');

  useEffect(() => {
    if (!loading && active) {
      navigation.replace('ChatThread', {
        threadId: active.id, coachId: active.trainerId, state: active.state,
      });
    }
  }, [loading, active?.id]);

  // Loading, or about to redirect into the thread.
  if (loading || active) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // No active coach → empty state.
  return (
    <View style={styles.empty}>
      <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>No coach assigned yet</Text>
      <Text style={styles.emptySub}>Visit the front desk to get a personal trainer.</Text>
      <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}>
        <Ionicons name="call" size={16} color={COLORS.black} />
        <Text style={styles.callTxt}>Call front desk</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 6 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  callTxt: { color: COLORS.black, fontWeight: '800' },
});
