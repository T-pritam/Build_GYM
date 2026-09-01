import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Linking, AppState,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../theme';
import { checkAppVersion } from '../services/appVersionService';

/**
 * Launch-time update gate.
 *   updateRequired  → full-screen BLOCKING modal (no dismiss) → Update.
 *   updateAvailable → dismissible prompt (once per app session).
 * Re-checks when the app returns to the foreground. Fails open (renders nothing).
 */
export default function UpdateGate() {
  const [info, setInfo] = useState(null);   // the version-check payload
  const [dismissed, setDismissed] = useState(false);

  const run = async () => {
    const data = await checkAppVersion();
    if (data && (data.updateRequired || data.updateAvailable)) setInfo(data);
    else setInfo(null);
  };

  useEffect(() => {
    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => sub.remove();
  }, []);

  if (!info) return null;
  const blocking = !!info.updateRequired;
  if (!blocking && dismissed) return null;

  const openStore = () => {
    if (info.storeUrl) Linking.openURL(info.storeUrl).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { if (!blocking) setDismissed(true); }}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="system-update" size={30} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.title}>{blocking ? 'Update Required' : 'Update Available'}</Text>
          <Text style={styles.body}>
            {info.message ||
              (blocking
                ? 'A newer version is required to continue. Please update to keep using the app.'
                : 'A new version is available with improvements and fixes.')}
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.85}>
            <Text style={styles.primaryText}>UPDATE NOW</Text>
          </TouchableOpacity>

          {!blocking && (
            <TouchableOpacity style={styles.laterBtn} onPress={() => setDismissed(true)} activeOpacity={0.7}>
              <Text style={styles.laterText}>Maybe later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,5,8,0.82)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 20, padding: 26, alignItems: 'center',
    backgroundColor: '#17141F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(157,79,255,0.14)', marginBottom: 16,
  },
  title: { fontFamily: FONTS.bodyBold, fontSize: 19, color: COLORS.white, marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 22 },
  primaryBtn: {
    width: '100%', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryText: { fontFamily: FONTS.label, fontSize: 14, letterSpacing: 2, color: COLORS.white },
  laterBtn: { marginTop: 12, paddingVertical: 8 },
  laterText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textMuted },
});
