import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Text } from './Text';
import {
  SHORT_MONTH_NAMES,
  WEEKDAY_LABELS,
  isMonthAfter,
  buildMonthGrid,
  calendarMonthLabel,
  parseDateString,
  shiftCalendarMonth,
  type CalendarMonth,
} from './calendarUtils';

export type CalendarPickerProps = {
  visible: boolean;
  /** Selected date, YYYY-MM-DD. */
  value: string;
  /** Latest selectable date, YYYY-MM-DD. Later days and months are disabled. */
  maxDate: string;
  /** Earliest selectable date, YYYY-MM-DD (e.g. a range's start). Earlier days and months are disabled. */
  minDate?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

function monthOf(value: string, fallback: string): CalendarMonth {
  const parsed = parseDateString(value) ?? parseDateString(fallback);
  return parsed ? { year: parsed.year, month: parsed.month } : { year: 1970, month: 1 };
}

export function CalendarPicker({ visible, value, maxDate, minDate, onSelect, onClose }: CalendarPickerProps) {
  const [shown, setShown] = useState<CalendarMonth>(() => monthOf(value, maxDate));
  // 'days' shows the day grid; 'months' lets the user jump straight to any month/year.
  const [mode, setMode] = useState<'days' | 'months'>('days');

  useEffect(() => {
    if (visible) {
      setShown(monthOf(value, maxDate));
      setMode('days');
    }
  }, [visible, value, maxDate]);

  const maxMonth = monthOf(maxDate, maxDate);
  const isMonths = mode === 'months';
  const minMonth = minDate ? monthOf(minDate, minDate) : null;
  const atMax = isMonths ? shown.year >= maxMonth.year : isMonthAfter(shiftCalendarMonth(shown, 1), maxMonth);
  const atMin = minMonth
    ? isMonths ? shown.year <= minMonth.year : isMonthAfter(minMonth, shiftCalendarMonth(shown, -1))
    : false;
  const outOfRange = (date: string) => date > maxDate || (minDate !== undefined && date < minDate);
  const goPrevious = () => setShown(isMonths ? { ...shown, year: shown.year - 1 } : shiftCalendarMonth(shown, -1));
  const goNext = () => setShown(isMonths ? { ...shown, year: shown.year + 1 } : shiftCalendarMonth(shown, 1));

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={styles.backdrop}>
        {/* Inner Pressable swallows taps so they don't close the sheet. */}
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isMonths ? 'Previous calendar year' : 'Previous calendar month'}
              accessibilityState={{ disabled: atMin }}
              disabled={atMin}
              onPress={goPrevious}
              style={[styles.arrow, atMin && styles.disabled]}
            >
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isMonths ? 'Show days' : 'Choose month and year'}
              onPress={() => setMode(isMonths ? 'days' : 'months')}
              style={styles.title}
            >
              <Text accessibilityLabel="Calendar month" variant="heading">
                {isMonths ? String(shown.year) : calendarMonthLabel(shown)}
              </Text>
              <Text style={styles.titleChevron}>{isMonths ? '▴' : '▾'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isMonths ? 'Next calendar year' : 'Next calendar month'}
              accessibilityState={{ disabled: atMax }}
              disabled={atMax}
              onPress={goNext}
              style={[styles.arrow, atMax && styles.disabled]}
            >
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
          {isMonths ? (
            <View style={styles.monthGrid}>
              {SHORT_MONTH_NAMES.map((name, index) => {
                const candidate = { year: shown.year, month: index + 1 };
                const future = isMonthAfter(candidate, maxMonth) || (minMonth !== null && isMonthAfter(minMonth, candidate));
                const current = candidate.month === shown.month;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${name} ${shown.year}`}
                    accessibilityState={{ disabled: future, selected: current }}
                    disabled={future}
                    key={name}
                    onPress={() => {
                      setShown(candidate);
                      setMode('days');
                    }}
                    style={[styles.monthCell, current && styles.selected, future && styles.disabled]}
                  >
                    <Text variant="label" style={current ? styles.selectedText : styles.dayText}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
          <>
          <View style={styles.week}>
            {WEEKDAY_LABELS.map(label => (
              <Text key={label} variant="caption" style={styles.weekday}>{label}</Text>
            ))}
          </View>
          {buildMonthGrid(shown).map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((date, dayIndex) => {
                if (!date) return <View key={`empty-${dayIndex}`} style={styles.day} />;
                const future = outOfRange(date);
                const selected = date === value;
                const today = date === maxDate;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Pick ${date}`}
                    accessibilityState={{ disabled: future, selected }}
                    disabled={future}
                    key={date}
                    onPress={() => onSelect(date)}
                    style={[styles.day, today && styles.today, selected && styles.selected, future && styles.disabled]}
                  >
                    <Text style={[styles.dayText, selected && styles.selectedText]}>{Number(date.slice(8))}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          </>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onClose} style={styles.cancel}>
            <Text variant="label" style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 31, 44, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.xs,
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  arrow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  titleChevron: { color: colors.primary, fontSize: 16 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  monthCell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 52,
    width: '31%',
  },
  arrowText: { color: colors.text, fontSize: 24, lineHeight: 28 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  day: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.full,
    flex: 1,
    justifyContent: 'center',
  },
  dayText: { color: colors.text, fontSize: 15 },
  today: { borderColor: colors.primary, borderWidth: 1 },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: colors.white, fontWeight: '700' },
  disabled: { opacity: 0.3 },
  cancel: { alignSelf: 'flex-end', marginTop: spacing.sm, padding: spacing.sm },
  cancelText: { color: colors.primary },
});
