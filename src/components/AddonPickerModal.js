import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const fmtPrice = (v) => { const n = Number(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(2); };

export default function AddonPickerModal({
  visible,
  itemName,
  basePrice,
  addons,
  onConfirm,
  onDismiss,
}) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const selectedAddons = addons.filter((a) => selected.includes(a.id));
  const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const total = basePrice + addonTotal;

  const handleConfirm = () => {
    onConfirm(selectedAddons);
    setSelected([]);
  };

  const handleSkip = () => {
    onConfirm([]);
    setSelected([]);
  };

  const handleDismiss = () => {
    setSelected([]);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleDismiss}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customiseLabel}>CUSTOMISE</Text>
            <Text style={styles.itemName} numberOfLines={2}>{itemName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {addons.map((addon) => {
            const isOn = selected.includes(addon.id);
            return (
              <TouchableOpacity
                key={addon.id}
                style={[styles.row, isOn && styles.rowSelected]}
                onPress={() => toggle(addon.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isOn ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isOn ? COLORS.secondary : COLORS.textMuted}
                />
                <Text style={styles.addonName}>{addon.name}</Text>
                <Text style={styles.addonPrice}>+₹{fmtPrice(addon.price)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>No extras</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleConfirm}>
            <Text style={styles.addText}>Add · ₹{fmtPrice(total)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  customiseLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 26,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  list: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondaryGlow,
  },
  addonName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    height: 50,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  addBtn: {
    flex: 2,
    height: 50,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
  },
});
