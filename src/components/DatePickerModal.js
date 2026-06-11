import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS } from '../theme';
import { HoloButton } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_H = 48;
const CY = new Date().getFullYear();

/** Returns the number of days in a given month, fully leap-year aware. */
function daysInMonth(monthIndex0, year) {
  // Day 0 of the NEXT month = last day of current month
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Generates the years array once (80 yrs back → current year). */
const YEARS = Array.from({ length: 81 }, (_, i) => String(CY - 80 + i));
const MONTHS = MONTHS_SHORT;

// ─── PickerColumn ─────────────────────────────────────────────────────────────
function PickerColumn({ data, selectedIndex, onIndexChange, width }) {
  const ref = useRef(null);
  // Prevents the useEffect from firing a second scroll when the user just
  // tapped an item (the press handler already scrolled).
  const justPressedRef = useRef(false);

  // Scroll to the correct item any time selectedIndex changes (initial mount
  // OR when it is clamped externally, e.g. day 31 → 28 after picking Feb).
  useEffect(() => {
    if (justPressedRef.current) {
      justPressedRef.current = false;
      return;
    }
    const safe = Math.max(0, Math.min(selectedIndex, data.length - 1));
    if (ref.current && safe >= 0) {
      setTimeout(() => {
        try {
          ref.current.scrollToIndex({ index: safe, animated: true });
        } catch (_) {}
      }, 60);
    }
  }, [selectedIndex, data.length]);

  const onScrollEnd = useCallback(
    (e) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      onIndexChange(Math.max(0, Math.min(idx, data.length - 1)));
    },
    [data.length, onIndexChange],
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const active = index === selectedIndex;
      return (
        <TouchableOpacity
          style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => {
            justPressedRef.current = true;
            try { ref.current?.scrollToIndex({ index, animated: true }); } catch (_) {}
            onIndexChange(index);
          }}
          activeOpacity={0.7}
        >
          <Text style={[dp.colItem, active && dp.colItemActive]}>{item}</Text>
        </TouchableOpacity>
      );
    },
    [selectedIndex, onIndexChange],
  );

  return (
    <View style={{ width, height: ITEM_H * 5, overflow: 'hidden' }}>
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        initialScrollIndex={Math.max(0, Math.min(selectedIndex, data.length - 1))}
        ListHeaderComponent={<View style={{ height: ITEM_H * 2 }} />}
        ListFooterComponent={<View style={{ height: ITEM_H * 2 }} />}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={renderItem}
      />
    </View>
  );
}

// ─── DatePickerModal ──────────────────────────────────────────────────────────
/**
 * Props:
 *   visible   – boolean
 *   value     – string  "DD / MM / YYYY" (pre-fills the picker)
 *   onConfirm – (string) => void   called with "DD / MM / YYYY"
 *   onClose   – () => void
 */
export default function DatePickerModal({ visible, value, onConfirm, onClose }) {
  // ── Parse incoming value ───────────────────────────────────────────────────
  const parseValue = () => {
    if (value) {
      const parts = value.split('/').map((s) => s.trim());
      if (parts.length === 3) {
        const d  = parseInt(parts[0], 10) - 1;           // 0-based day index
        const m  = parseInt(parts[1], 10) - 1;           // 0-based month index
        const yi = YEARS.indexOf(parts[2]);
        return {
          d: Math.max(0, d),
          m: Math.max(0, Math.min(m, 11)),
          y: yi >= 0 ? yi : YEARS.indexOf(String(CY - 25)),
        };
      }
    }
    const defY = YEARS.indexOf(String(CY - 25));
    return { d: 0, m: 0, y: defY >= 0 ? defY : 55 };
  };

  const init = parseValue();
  const [dayIdx, setDayIdx] = useState(init.d);
  const [monIdx, setMonIdx] = useState(init.m);
  const [yrIdx,  setYrIdx]  = useState(init.y);

  // ── Derive days array for current month + year (leap-year aware) ───────────
  const currentYear = parseInt(YEARS[yrIdx], 10);
  const maxDays     = daysInMonth(monIdx, currentYear);
  const days        = Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, '0'));

  // ── Clamp dayIdx when the month or year changes ────────────────────────────
  // e.g. user picks day 31, then switches to February → clamp to 28/29
  useEffect(() => {
    const max = daysInMonth(monIdx, parseInt(YEARS[yrIdx], 10)) - 1; // 0-based
    if (dayIdx > max) setDayIdx(max);
  }, [monIdx, yrIdx]);

  // ── Re-sync internal state if the modal reopens with a new value ───────────
  useEffect(() => {
    if (visible) {
      const p = parseValue();
      setDayIdx(p.d);
      setMonIdx(p.m);
      setYrIdx(p.y);
    }
  }, [visible]);

  const handleConfirm = () => {
    const d = days[dayIdx] ?? String(maxDays).padStart(2, '0'); // guard
    const m = String(monIdx + 1).padStart(2, '0');
    const y = YEARS[yrIdx];
    onConfirm(`${d} / ${m} / ${y}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={dp.overlay} activeOpacity={1} onPress={onClose}>
        {/* Inner press stops propagation so tapping picker doesn't close */}
        <TouchableOpacity activeOpacity={1} style={dp.sheet}>
          <View style={dp.handle} />
          <Text style={dp.title}>Date of Birth</Text>

          <View style={dp.colLabels}>
            <Text style={[dp.colLabel, { width: 64 }]}>Day</Text>
            <Text style={[dp.colLabel, { width: 80 }]}>Month</Text>
            <Text style={[dp.colLabel, { width: 80 }]}>Year</Text>
          </View>

          <View style={{ position: 'relative' }}>
            {/* Highlight band sits at the centre row */}
            <View style={dp.band} pointerEvents="none" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <PickerColumn data={days}   selectedIndex={dayIdx} onIndexChange={setDayIdx} width={64} />
              <Text style={dp.sep}>/</Text>
              <PickerColumn data={MONTHS} selectedIndex={monIdx} onIndexChange={setMonIdx} width={80} />
              <Text style={dp.sep}>/</Text>
              <PickerColumn data={YEARS}  selectedIndex={yrIdx}  onIndexChange={setYrIdx}  width={80} />
            </View>
          </View>

          <HoloButton label="CONFIRM DATE" onPress={handleConfirm} style={dp.confirmBtn} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const dp = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:    {
    backgroundColor: '#1B191E',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 44,
  },
  handle:   {
    width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, alignSelf: 'center', marginTop: 14,
  },
  title:    {
    fontFamily: FONTS.headline, color: COLORS.textPrimary, fontSize: 18,
    textAlign: 'center', marginTop: 18, marginBottom: 4, letterSpacing: 0.5,
  },
  colLabels: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 4, marginBottom: 6, paddingHorizontal: 20,
  },
  colLabel:  {
    textAlign: 'center', fontFamily: FONTS.label, fontSize: 10,
    color: COLORS.primaryLight, letterSpacing: 2, textTransform: 'uppercase',
  },
  sep: { color: 'rgba(255,255,255,0.25)', fontSize: 20, fontWeight: '300', marginBottom: 4 },
  band: {
    position: 'absolute',
    left: 12, right: 12,
    height: ITEM_H,
    top: ITEM_H * 2,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
    zIndex: 10,
  },
  colItem:       { fontFamily: FONTS.body, fontSize: 15, color: 'rgba(255,255,255,0.25)' },
  colItemActive: { fontFamily: FONTS.headline, fontSize: 19, color: COLORS.textPrimary },
  confirmBtn: { marginHorizontal: 20, marginTop: 20 },
});
