import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { getDayStatusRepository } from '../../database/dayStatusRepository';
import { notifyEntriesChanged } from '../entries/entryEvents';

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

type NativeReminder = {
  getSettings(): Promise<ReminderSettings>;
  enable(hour: number, minute: number): Promise<void>;
  disable(): Promise<void>;
  getPendingNothingDays(): Promise<string>;
  removePendingNothingDays(datesJson: string): Promise<void>;
};

/** Evening times offered; 9 PM is the default. */
export const REMINDER_TIMES = [
  { hour: 19, minute: 0, label: '7 PM' },
  { hour: 20, minute: 0, label: '8 PM' },
  { hour: 21, minute: 0, label: '9 PM' },
  { hour: 22, minute: 0, label: '10 PM' },
  { hour: 23, minute: 0, label: '11 PM' },
];

function native(): NativeReminder | null {
  return Platform.OS === 'android' ? ((NativeModules.KharchivaReminder as NativeReminder | undefined) ?? null) : null;
}

export const isReminderAvailable = () => native() !== null;

export async function getReminderSettings(): Promise<ReminderSettings> {
  const module = native();
  if (!module) return { enabled: false, hour: 21, minute: 0 };
  return module.getSettings();
}

/** Android 13+ needs permission to show notifications. Resolves false if refused. */
async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  const permission = 'android.permission.POST_NOTIFICATIONS' as const;
  if (await PermissionsAndroid.check(permission)) return true;
  return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
}

export async function enableReminder(hour: number, minute: number): Promise<boolean> {
  const module = native();
  if (!module) return false;
  if (!(await ensureNotificationPermission())) return false;
  await module.enable(hour, minute);
  return true;
}

export async function disableReminder(): Promise<void> {
  await native()?.disable();
}

/**
 * Moves days marked "Kuch nahi" from the notification (stored natively while the app
 * was closed) into the app database. Safe to call on every app start/foreground.
 */
export async function syncNothingDaysFromNotification(): Promise<void> {
  const module = native();
  if (!module) return;
  const days = JSON.parse(await module.getPendingNothingDays()) as string[];
  if (days.length === 0) return;
  const repository = await getDayStatusRepository();
  for (const day of days) await repository.markNoExpense(day);
  await module.removePendingNothingDays(JSON.stringify(days));
  notifyEntriesChanged();
}
