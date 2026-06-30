/**
 * MyChatScreen — the member's coach chat entry point.
 * Shows the current (active) coach thread prominently + any "Past coaches"
 * (archived threads, kept read-only after a transfer/removal). Empty state when
 * the member has no coach yet.
 */
import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

import { COLORS } from '../../theme/colors';
import { useChatStore } from '../../store/chatStore';
import { RECEPTION_PHONE } from '../../services/notificationService';

export default function MyChatScreen({ navigation }) {
  const threads = useChatStore((s) => s.threads);
  const init = useChatStore((s) => s.init);

  useFocusEffect(useCallback(() => { init(); }, [init]));

  const active = threads.filter((t) => t.state !== 'archived');
  const past = threads.filter((t) => t.state === 'archived');

  const openThread = (t) => navigation.navigate('ChatThread', {
    threadId: t.id, coachId: t.trainerId, state: t.state,
  });

  if (!threads.length) {
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

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 12 }}
      data={[...active, ...past]}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={active.length ? <Text style={styles.section}>My Coach</Text> : null}
      renderItem={({ item, index }) => {
        const firstPast = past.length && index === active.length;
        return (
          <>
            {firstPast ? <Text style={styles.section}>Past coaches</Text> : null}
            <ThreadRow t={item} onPress={() => openThread(item)} />
          </>
        );
      }}
    />
  );
}

function ThreadRow({ t, onPress }) {
  const archived = t.state === 'archived';
  return (
    <TouchableOpacity style={[styles.row, archived && styles.rowFaded]} onPress={onPress}>
      <View style={styles.avatar}><Ionicons name="person" size={22} color={COLORS.textSecondary} /></View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>Your Coach</Text>
          {t.lastMessageAt ? <Text style={styles.time}>{dayjs(t.lastMessageAt).format('DD MMM')}</Text> : null}
        </View>
        <View style={styles.rowTop}>
          <Text style={styles.preview} numberOfLines={1}>
            {archived ? 'Ended' : (t.lastMessagePreview || 'Say hi to your coach 👋')}
          </Text>
          {t.muted ? <Ionicons name="notifications-off" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} /> : null}
          {t.state === 'frozen' ? <Ionicons name="lock-closed" size={14} color={COLORS.warning} style={{ marginRight: 6 }} /> : null}
          {t.unread > 0 ? <View style={styles.pill}><Text style={styles.pillTxt}>{t.unread}</Text></View> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  section: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginVertical: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 14, padding: 12, marginBottom: 8 },
  rowFaded: { opacity: 0.6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  time: { color: COLORS.textMuted, fontSize: 11 },
  preview: { color: COLORS.textSecondary, fontSize: 13, flex: 1, marginTop: 2 },
  pill: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, height: 20, alignItems: 'center', justifyContent: 'center' },
  pillTxt: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 6 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  callTxt: { color: COLORS.black, fontWeight: '800' },
});
