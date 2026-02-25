import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { name: 'Cafe', icon: 'restaurant-outline', activeIcon: 'restaurant', label: 'Café' },
    { name: 'Access', icon: null, label: null }, // center button
    { name: 'dummy1', icon: null, label: null, hidden: true },
    { name: 'dummy2', icon: null, label: null, hidden: true },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {/* Home tab */}
        <TabItem
          icon="home-outline"
          activeIcon="home"
          label="Home"
          active={state.index === 0}
          onPress={() => navigation.navigate('Home')}
        />

        {/* Cafe tab */}
        <TabItem
          icon="restaurant-outline"
          activeIcon="restaurant"
          label="Café"
          active={state.index === 1}
          onPress={() => navigation.navigate('Cafe')}
        />

        {/* Center Access button spacer */}
        <View style={styles.centerSpacer} />

        {/* Community tab */}
        <TabItem
          icon="newspaper-outline"
          activeIcon="newspaper"
          label="Community"
          active={false}
          onPress={() => navigation.navigate('Community')}
          customNav
        />

        <TabItem
          icon="person-outline"
          activeIcon="person"
          label="Profile"
          active={false}
          onPress={() => navigation.navigate('Profile')}
          customNav
        />
      </View>

      {/* Floating center Access button */}
      <TouchableOpacity
        style={styles.centerBtnWrapper}
        onPress={() => navigation.navigate('Access')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={
            state.index === 2
              ? [COLORS.secondary, COLORS.secondaryDark]
              : [COLORS.secondaryDark, '#330D00']
          }
          style={styles.centerBtn}
        >
          <Ionicons name="wifi-outline" size={24} color={COLORS.white} />
          <Text style={styles.centerBtnLabel}>ACCESS</Text>
        </LinearGradient>
        {state.index === 2 && <View style={styles.centerBtnGlow} />}
      </TouchableOpacity>
    </View>
  );
}

function TabItem({ icon, activeIcon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={active ? activeIcon : icon}
        size={22}
        color={active ? COLORS.secondary : COLORS.textMuted}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabActiveBar} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.secondary,
    fontWeight: '800',
  },
  tabActiveBar: {
    position: 'absolute',
    bottom: -10,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.secondary,
  },
  centerSpacer: {
    width: 70,
  },

  // Center Access button
  centerBtnWrapper: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  centerBtnLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  centerBtnGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,107,0,0.12)',
    zIndex: -1,
  },
});
