import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { notifications } from '../../constants/dummyData';

const NOTIF_ICONS = {
  membership: { icon: 'card-outline', color: COLORS.secondary },
  cafe: { icon: 'restaurant-outline', color: '#4CAF50' },
  coins: { icon: 'logo-bitcoin', color: COLORS.secondary },
  announcement: { icon: 'megaphone-outline', color: '#2196F3' },
  access: { icon: 'lock-open-outline', color: '#9C27B0' },
  default: { icon: 'notifications-outline', color: COLORS.textMuted },
};

export default function NotificationsScreen({ navigation }) {
  const [notifs, setNotifs] = useState(notifications);
  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {notifs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={52} color={COLORS.textDim} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifs.map((notif) => {
            const { icon, color } = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                onPress={() => markRead(notif.id)}
                activeOpacity={0.75}
              >
                {!notif.read && <View style={styles.unreadDot} />}
                <View style={[styles.notifIcon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={icon} size={20} color={color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifBody}>{notif.body}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  unreadBadge: {
    backgroundColor: COLORS.secondary, borderRadius: 10, paddingHorizontal: 7,
    paddingVertical: 1, minWidth: 20, alignItems: 'center',
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  scroll: { padding: 16 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10, gap: 12, position: 'relative',
  },
  notifCardUnread: { borderColor: COLORS.secondaryBorder, backgroundColor: `${COLORS.secondaryGlow}` },
  unreadDot: {
    position: 'absolute', top: 14, right: 14, width: 8, height: 8,
    borderRadius: 4, backgroundColor: COLORS.secondary,
  },
  notifIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  notifBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 14 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
