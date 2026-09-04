/**
 * MyChatScreen — the member's coaching chats.
 *
 * A trainee has at most one LIVE coach, but past coaching relationships stay
 * readable: archived threads are listed under "Past coaches" and open read-only.
 * With no thread at all we show the "No coach assigned yet" empty state.
 *
 * The live thread is opened directly when it's the only thing here, so the common
 * case (one coach, no history) still lands straight in the conversation.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, FlatList, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

import { COLORS } from '../../theme/colors';
import { useChatStore } from '../../store/chatStore';
import { RECEPTION_PHONE } from '../../services/notificationService';

export default function MyChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const threads = useChatStore((s) => s.threads);
  const init = useChatStore((s) => s.init);
  const [loading, setLoading] = useState(true);
  const [redirected, setRedirected] = useState(false);

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
  const past = threads.filter((t) => t.state === 'archived');

  const open = useCallback((t, replace) => {
    const params = {
      threadId: t.id,
      coachId: t.trainerId || t.counterpartId,
      coachName: t.counterpartName,
      coachPhoto: t.counterpartPhoto,
      state: t.state,
    };
    if (replace) navigation.replace('ChatThread', params);
    else navigation.navigate('ChatThread', params);
  }, [navigation]);

  // One live coach and no history to browse → go straight into the conversation.
  useEffect(() => {
    if (loading || redirected) return;
    if (active && past.length === 0) {
      setRedirected(true);
      open(active, true);
    }
  }, [loading, redirected, active?.id, past.length, open]);

  if (loading || (active && past.length === 0)) {
    return (
      <View style={styles.screen}>
        <ScreenHeader navigation={navigation} topInset={insets.top} />
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  // No coach now and none before → the front-desk empty state.
  if (!active && past.length === 0) {
    return (
      <View style={styles.screen}>
        <ScreenHeader navigation={navigation} topInset={insets.top} />
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No coach assigned yet</Text>
          <Text style={styles.emptySub}>Visit the front desk to get a personal trainer.</Text>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}>
            <Ionicons name="call" size={16} color={COLORS.black} />
            <Text style={styles.callTxt}>Call front desk</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const data = [...(active ? [active] : []), ...past];

  return (
    <View style={styles.screen}>
      <ScreenHeader navigation={navigation} topInset={insets.top} />
      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item, index }) => (
          <>
            {past.length > 0 && index === (active ? 1 : 0)
              ? <Text style={styles.section}>Past coaches</Text>
              : null}
            <Row t={item} onPress={() => open(item, false)} />
          </>
        )}
        ListFooterComponent={!active ? (
          <View style={styles.footerNote}>
            <Text style={styles.emptySub}>No coach assigned yet. Visit the front desk to get a personal trainer.</Text>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}>
              <Ionicons name="call" size={16} color={COLORS.black} />
              <Text style={styles.callTxt}>Call front desk</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      />
    </View>
  );
}

function ScreenHeader({ navigation, topInset }) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
      <TouchableOpacity
        style={styles.hBtn}
        onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.hTitle}>My Coach</Text>
      <View style={styles.hBtn} />
    </View>
  );
}

function Row({ t, onPress }) {
  const archived = t.state === 'archived';
  return (
    <TouchableOpacity style={[styles.row, archived && styles.rowArchived]} onPress={onPress} activeOpacity={0.85}>
      {t.counterpartPhoto
        ? <Image source={{ uri: t.counterpartPhoto }} style={styles.avatar} />
        : <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{(t.counterpartName || 'C').charAt(0).toUpperCase()}</Text>
          </View>}
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {t.counterpartName || 'Your Coach'}{archived ? ' · Ended' : ''}
          </Text>
          {t.lastMessageAt ? <Text style={styles.time}>{dayjs(t.lastMessageAt).format('D MMM')}</Text> : null}
        </View>
        <Text style={styles.preview} numberOfLines={1}>{t.lastMessagePreview || 'No messages yet'}</Text>
      </View>
      {t.state === 'frozen' ? <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} style={{ marginLeft: 6 }} /> : null}
      {t.muted ? <Ionicons name="notifications-off" size={14} color={COLORS.textMuted} style={{ marginLeft: 6 }} /> : null}
      {t.unread > 0 ? <View style={styles.pill}><Text style={styles.pillTxt}>{t.unread}</Text></View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  hBtn: { padding: 6, width: 36 },
  hTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  empty: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 6 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  callTxt: { color: COLORS.black, fontWeight: '800' },
  footerNote: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  section: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 14, marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 8 },
  rowArchived: { opacity: 0.6 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: { backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  time: { color: COLORS.textMuted, fontSize: 11, marginLeft: 8 },
  preview: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  pill: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8, alignItems: 'center' },
  pillTxt: { color: COLORS.black, fontSize: 11, fontWeight: '800' },
});
