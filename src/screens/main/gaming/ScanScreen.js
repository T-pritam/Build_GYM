import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const C = { bg: '#0B1020', text: '#FFFFFF', sub: '#C8D3F0', accent: '#8FB2FF' };

/**
 * Scans the QR the agent displays on an IDLE PC. The payload is "PC-01|<signedToken>"
 * (see Agent.App). We split it and hand pcCode + qrToken to the consent screen.
 */
export default function GamingScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);

  const onScan = useCallback(({ data }) => {
    if (handled || !data) return;
    const [pcCode, qrToken] = String(data).split('|');
    if (!pcCode || !qrToken) return; // ignore unrelated QR codes
    setHandled(true);
    navigation.replace('GamingConsent', { pcCode, qrToken });
  }, [handled, navigation]);

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <Ionicons name="camera-outline" size={48} color={C.accent} />
        <Text style={styles.msg}>Camera access is needed to scan the PC.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.frame} />
        <Text style={styles.hint}>Point at the QR on the gaming PC</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  msg: { color: C.sub, fontSize: 16, textAlign: 'center', marginTop: 16, paddingHorizontal: 40 },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  btnText: { color: '#0B1020', fontWeight: '800', fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', top: 56, left: 20 },
  frame: { width: 240, height: 240, borderRadius: 20, borderWidth: 3, borderColor: '#8FB2FF' },
  hint: { color: '#fff', fontSize: 16, marginTop: 24, fontWeight: '600' },
});
