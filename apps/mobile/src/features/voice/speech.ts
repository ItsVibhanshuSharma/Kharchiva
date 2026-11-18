import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

/**
 * Thin wrapper over react-native-speech-recognition-kit.
 *
 * - The library creates a NativeEventEmitter at import time, which throws when the
 *   native module is missing (tests, or a build without the module). We load it lazily.
 * - Its destroy() nulls the recognizer and later startListening() calls then fail
 *   with NOT_AVAILABLE, so we only ever stop, never destroy.
 * - On Android it always uses the phone's language (Locale.getDefault()).
 */

type SpeechKit = typeof import('react-native-speech-recognition-kit');

export type SpeechHandlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};

let kit: SpeechKit | null | undefined;

function loadKit(): SpeechKit | null {
  if (kit !== undefined) return kit;
  if (!NativeModules.SpeechRecognition) {
    kit = null;
    return kit;
  }
  try {
    kit = require('react-native-speech-recognition-kit') as SpeechKit;
  } catch {
    kit = null;
  }
  return kit;
}

export async function isSpeechAvailable(): Promise<boolean> {
  const speech = loadKit();
  if (!speech) return false;
  try {
    return await speech.isRecognitionAvailable();
  } catch {
    return false;
  }
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS prompts on first use via Info.plist strings.
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (granted) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone',
    message: 'Kharchiva listens only after you tap the mic, to turn what you say into an entry. Nothing is recorded or uploaded by Kharchiva.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function readText(event: unknown): string {
  if (typeof event === 'string') return event;
  if (event && typeof event === 'object' && 'value' in event) {
    const value = (event as { value: unknown }).value;
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return '';
}

/** Android SpeechRecognizer error codes that just mean "heard nothing". */
const NOTHING_HEARD = new Set([6, 7]); // ERROR_SPEECH_TIMEOUT, ERROR_NO_MATCH

function friendlyError(event: unknown): string {
  const code = event && typeof event === 'object' && 'code' in event ? Number((event as { code: unknown }).code) : NaN;
  if (NOTHING_HEARD.has(code)) return 'Kuch sunai nahi diya. Phir se bolo.';
  if (code === 2 || code === 4) return 'Network issue. Internet on karke phir try karo.';
  if (code === 9) return 'Microphone ki permission chahiye.';
  return 'Awaaz samajh nahi aayi. Phir se try karo ya type kar do.';
}

/**
 * Starts listening. Resolves to a stop function, or rejects with a user-facing
 * message when speech isn't available or the mic permission is refused.
 */
export async function startSpeech(handlers: SpeechHandlers): Promise<() => Promise<void>> {
  const speech = loadKit();
  if (!speech) throw new Error('Is phone par voice input available nahi hai. Type karke add karo.');
  if (!(await ensureMicPermission())) throw new Error('Microphone ki permission chahiye. Settings se allow karo.');

  const events = speech.speechRecogntionEvents;
  const subscriptions = [
    speech.addEventListener(events.PARTIAL_RESULTS, event => handlers.onPartial(readText(event))),
    speech.addEventListener(events.RESULTS, event => handlers.onFinal(readText(event))),
    speech.addEventListener(events.END, () => handlers.onEnd()),
    speech.addEventListener(events.ERROR, event => handlers.onError(friendlyError(event))),
  ];
  const cleanup = () => subscriptions.forEach(subscription => subscription.remove());

  try {
    await speech.startListening();
  } catch (error) {
    cleanup();
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
    if (code === 'PERMISSION_DENIED') throw new Error('Microphone ki permission chahiye. Settings se allow karo.');
    throw new Error('Voice input shuru nahi ho paya. Type karke add karo.');
  }

  return async () => {
    try {
      await speech.stopListening();
    } catch {
      // Already stopped.
    } finally {
      cleanup();
    }
  };
}
