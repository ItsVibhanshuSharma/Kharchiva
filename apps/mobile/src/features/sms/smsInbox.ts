import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { parseBankSms, type SmsDraft, type SmsMessage } from './parseBankSms';

type NativeSms = {
  getPending(): Promise<string>;
  remove(idsJson: string): Promise<void>;
};

const PERMISSION = 'android.permission.RECEIVE_SMS' as const;

function native(): NativeSms | null {
  return Platform.OS === 'android' ? ((NativeModules.KharchivaSms as NativeSms | undefined) ?? null) : null;
}

export const isSmsDetectionAvailable = () => native() !== null;

export async function hasSmsPermission(): Promise<boolean> {
  if (!native()) return false;
  return PermissionsAndroid.check(PERMISSION);
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!native()) return false;
  return (await PermissionsAndroid.request(PERMISSION)) === PermissionsAndroid.RESULTS.GRANTED;
}

export async function discardSms(ids: string[]): Promise<void> {
  const module = native();
  if (module && ids.length) await module.remove(JSON.stringify(ids));
}

/** Queued SMS turned into drafts. Messages that are not real transactions are dropped from the queue. */
export async function loadSmsDrafts(): Promise<SmsDraft[]> {
  const module = native();
  if (!module) return [];
  const messages = JSON.parse(await module.getPending()) as SmsMessage[];
  const drafts: SmsDraft[] = [];
  const unusable: string[] = [];
  for (const message of messages) {
    const draft = parseBankSms(message);
    if (draft) drafts.push(draft);
    else unusable.push(message.id);
  }
  await discardSms(unusable);
  return drafts.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
