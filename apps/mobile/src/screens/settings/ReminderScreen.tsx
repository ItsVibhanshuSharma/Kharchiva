import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { showSnackbar } from '../../components/snackbar';
import {
  REMINDER_TIMES,
  disableReminder,
  enableReminder,
  getReminderSettings,
  isReminderAvailable,
  type ReminderSettings,
} from '../../features/reminder/reminder';
import type { RootStackParamList } from '../../navigation/types';
import { t as translateNow } from '../../i18n/i18n';
import { colors, radius, spacing } from '../../theme';

export function ReminderScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const available = isReminderAvailable();

  useEffect(() => {
    getReminderSettings().then(setSettings, () => setSettings({ enabled: false, hour: 21, minute: 0 }));
  }, []);

  const apply = async (enabled: boolean, hour: number, minute: number) => {
    setBusy(true);
    try {
      if (!enabled) {
        await disableReminder();
        setSettings({ enabled: false, hour, minute });
        showSnackbar({ message: 'Reminder band' });
        return;
      }
      const ok = await enableReminder(hour, minute);
      if (!ok) {
        showSnackbar({ tone: 'error', message: 'Notification ki permission chahiye. Settings se allow karo.' });
        return;
      }
      setSettings({ enabled: true, hour, minute });
      const label = REMINDER_TIMES.find(item => item.hour === hour && item.minute === minute)?.label ?? `${hour}:${String(minute).padStart(2, '0')}`;
      showSnackbar({ message: translateNow('Roz {time} par yaad dilayenge', { time: label }) });
    } catch {
      showSnackbar({ tone: 'error', message: 'Reminder set nahi ho paya. Phir try karo.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title="Roz ka reminder" showBack onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text variant="caption" style={styles.intro}>
          Din mein ek baar poochhenge: "Aaj koi kharcha hua?" Agar aaj kuch likh chuke ho to reminder nahi aayega. Notification se hi
          "Kuch nahi" bol sakte ho, app kholne ki zaroorat nahi.
        </Text>

        {!available ? (
          <Text variant="caption" style={styles.unavailable}>Ye phone par reminder abhi available nahi hai.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="label" style={styles.rowTitle}>Reminder</Text>
                  <Text variant="caption">{settings?.enabled ? 'Chalu hai' : 'Band hai'}</Text>
                </View>
                <Switch
                  accessibilityLabel="Daily reminder"
                  disabled={busy || !settings}
                  onValueChange={value => {
                    if (settings) apply(value, settings.hour, settings.minute);
                  }}
                  thumbColor={colors.white}
                  trackColor={{ false: '#D8D4DD', true: colors.primary }}
                  value={Boolean(settings?.enabled)}
                />
              </View>
            </View>

            <Text variant="label" style={styles.label}>KAB?</Text>
            <View style={styles.times}>
              {REMINDER_TIMES.map(time => {
                const selected = settings?.hour === time.hour && settings?.minute === time.minute;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remind at ${time.label}`}
                    accessibilityState={{ selected }}
                    disabled={busy || !settings}
                    key={time.label}
                    onPress={() => apply(true, time.hour, time.minute)}
                    style={[styles.time, selected && styles.timeSelected]}
                  >
                    <Text variant="label" style={selected ? styles.timeTextSelected : styles.timeText}>{time.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption">Time chunte hi reminder chalu ho jaata hai.</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg },
  intro: { lineHeight: 18 },
  unavailable: { color: colors.destructive },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 15 },
  label: { color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.sm },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  time: { borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  timeSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { color: colors.text },
  timeTextSelected: { color: colors.white },
});
