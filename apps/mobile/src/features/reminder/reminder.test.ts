import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { enableReminder, syncNothingDaysFromNotification } from './reminder';

const mockMark = jest.fn(() => Promise.resolve());
jest.mock('../../database/dayStatusRepository', () => ({ getDayStatusRepository: () => Promise.resolve({ markNoExpense: mockMark }) }));
const mockNotify = jest.fn();
jest.mock('../entries/entryEvents', () => ({ notifyEntriesChanged: () => mockNotify() }));

describe('reminder', () => {
  const native = {
    getSettings: jest.fn(),
    enable: jest.fn(() => Promise.resolve()),
    disable: jest.fn(() => Promise.resolve()),
    getPendingNothingDays: jest.fn(() => Promise.resolve('[]')),
    removePendingNothingDays: jest.fn(() => Promise.resolve()),
  };
  const originalOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 33, configurable: true });
    NativeModules.KharchivaReminder = native;
    Object.values(native).forEach(fn => fn.mockClear());
    mockMark.mockClear();
    mockNotify.mockClear();
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    delete NativeModules.KharchivaReminder;
    jest.restoreAllMocks();
  });

  it('moves "Kuch nahi" taps from the notification into the database, then clears them', async () => {
    native.getPendingNothingDays.mockResolvedValueOnce('["2026-11-17","2026-11-18"]');
    await syncNothingDaysFromNotification();
    expect(mockMark.mock.calls).toEqual([['2026-11-17'], ['2026-11-18']]);
    expect(native.removePendingNothingDays).toHaveBeenCalledWith('["2026-11-17","2026-11-18"]');
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is nothing queued', async () => {
    await syncNothingDaysFromNotification();
    expect(mockMark).not.toHaveBeenCalled();
    expect(native.removePendingNothingDays).not.toHaveBeenCalled();
  });

  it('only schedules after notification permission is granted (Android 13+)', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);
    await expect(enableReminder(21, 0)).resolves.toBe(false);
    expect(native.enable).not.toHaveBeenCalled();

    request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);
    await expect(enableReminder(21, 0)).resolves.toBe(true);
    expect(native.enable).toHaveBeenCalledWith(21, 0);
  });
});
