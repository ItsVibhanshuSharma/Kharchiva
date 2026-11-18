import { Alert, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { askForSmsPermission } from './smsInbox';

describe('askForSmsPermission', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    NativeModules.KharchivaSms = { getPending: jest.fn(), remove: jest.fn() };
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    delete NativeModules.KharchivaSms;
    jest.restoreAllMocks();
  });

  it('explains what is read before the system prompt, and requests only if the user agrees', async () => {
    const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, message, buttons) => {
      expect(message).toContain('OTP aur personal SMS ignore');
      expect(message).toContain('kahin upload nahi hota');
      expect(request).not.toHaveBeenCalled();
      buttons?.find(button => button.text === 'Chalu karo')?.onPress?.();
    });
    await expect(askForSmsPermission()).resolves.toBe(true);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('android.permission.RECEIVE_SMS');
  });

  it('never asks the system when the user says not now', async () => {
    const request = jest.spyOn(PermissionsAndroid, 'request');
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.text === 'Abhi nahi')?.onPress?.();
    });
    await expect(askForSmsPermission()).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
