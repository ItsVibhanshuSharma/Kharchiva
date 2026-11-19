import { profileData } from '../../screens/profile/profileData';
import { createLocalGroupsApi, sqliteStore } from './localGroupsApi';
import type { GroupsApi } from './types';

let instance: GroupsApi | undefined;

/**
 * The one place that decides which backend the Splitwise screens talk to.
 * Today it is the on-phone version. To go online, return an adapter that calls the server here.
 */
export function getGroupsApi(): GroupsApi {
  if (!instance) {
    instance = createLocalGroupsApi({
      store: sqliteStore,
      me: () => ({
        displayName: profileData.name,
        phoneNumber: normalizePhone(profileData.phone),
      }),
    });
  }
  return instance;
}

/** Turns "98765 43210" or "+91 98765 43210" into "+919876543210". Null when it is not a valid Indian mobile number. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const national = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}
