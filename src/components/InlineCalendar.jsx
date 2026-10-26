import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(viewMonth) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    cells.push(date);
  }
  return cells;
}

/**
 * Port of AllyDocReactApp's ManageAppointmentsCalendar.css ".custom-datepicker"
 * (inline react-datepicker styling): navy-to-blue gradient card, white text,
 * circular day cells, selected day = white pill with blue text, today = white
 * ring outline.
 */
export default function InlineCalendar({ selectedDate, onSelectDate }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const today = new Date();
  const cells = buildMonthGrid(viewMonth);

  // Jumps the visible month whenever selectedDate changes to a different
  // month from outside (e.g. a "Today" shortcut button), not just via the
  // in-grid day taps this component already tracks itself.
  useEffect(() => {
    if (selectedDate.getFullYear() !== viewMonth.getFullYear() || selectedDate.getMonth() !== viewMonth.getMonth()) {
      setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const goToPrevMonth = () => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <LinearGradient colors={['#0F172A', '#1E3A5F', '#1D4ED8']} style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} hitSlop={8} style={styles.navButton}>
          <Feather name="chevron-left" size={18} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.monthLabel}>
          {viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={goToNextMonth} hitSlop={8} style={styles.navButton}>
          <Feather name="chevron-right" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.dayNamesRow}>
        {DAY_NAMES.map((name) => (
          <Text key={name} style={styles.dayNameText}>
            {name}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          const isOutsideMonth = date.getMonth() !== viewMonth.getMonth();
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          return (
            <Pressable
              key={index}
              style={styles.dayCellWrap}
              onPress={() => onSelectDate(date)}
            >
              <View
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    isOutsideMonth && styles.dayCellTextOutside,
                    isSelected && styles.dayCellTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const CELL_SIZE = 34;

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 12, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  navButton: { padding: 4 },
  monthLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  dayNamesRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 2 },
  dayNameText: { color: '#FFFFFF', fontWeight: '600', fontSize: 11.5, flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCellWrap: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: { backgroundColor: '#FFFFFF' },
  dayCellToday: { borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.7)' },
  dayCellText: { color: '#FFFFFF', fontSize: 13 },
  dayCellTextOutside: { color: 'rgba(255, 255, 255, 0.3)' },
  dayCellTextSelected: { color: '#2563EB', fontWeight: '700' },
});
