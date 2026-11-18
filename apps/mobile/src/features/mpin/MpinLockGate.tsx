import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MpinInput } from '../../components/MpinInput';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { colors, spacing } from '../../theme';
import { getMpinStore } from './getMpinStore';
import { MPIN_LENGTH, type MpinStore } from './mpinStore';
type GateState = 'checking' | 'locked' | 'open';
/** Asks for the MPIN when the app starts, if one was set from Profile. */
export function MpinLockGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('checking');
  const [store, setStore] = useState<MpinStore | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let active = true;
    getMpinStore()
      .then(async mpinStore => {
        const isSet = await mpinStore.isSet();
        if (!active) return;
        setStore(mpinStore);
        const remaining = isSet ? await mpinStore.lockRemainingMs() : 0;
        if (!active) return;
        // 0 means "not locked". Only a real lockout stores an end time.
        const current = Date.now();
        setNow(current);
        setLockedUntil(remaining > 0 ? current + remaining : 0);
        setState(isSet ? 'locked' : 'open');
      })
      // If local storage cannot be read there is nothing to unlock with, so do not trap the user.
      .catch(() => active && setState('open'));
    return () => {
      active = false;
    };
  }, []);
  const secondsLeft = lockedUntil > 0 ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  useEffect(() => {
    if (state !== 'locked' || lockedUntil === 0) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) setLockedUntil(0);
    }, 500);
    return () => clearInterval(timer);
  }, [state, lockedUntil]);
  const submit = useCallback(
    async (value: string) => {
      if (!store) return;
      const result = await store.verify(value);
      setCode('');
      if (result.ok) {
        setState('open');
        return;
      }
      if (result.lockedUntil) {
        setNow(Date.now());
        setLockedUntil(result.lockedUntil);
        setMessage('');
      } else {
        setMessage(`Galat MPIN. ${result.attemptsLeft} koshish bachi hain.`);
      }
    },
    [store],
  );
  const onChange = (value: string) => {
    setCode(value);
    setMessage('');
    if (value.length === MPIN_LENGTH) submit(value).catch(() => setMessage('MPIN check nahi ho paya. Dobara try karo.'));
  };
  // Removing the MPIN here is safe because the app restarts at the phone sign-in flow.
  const forgot = async () => {
    await store?.remove();
    setState('open');
  };
  if (state === 'open') return <>{children}</>;
  if (state === 'checking') return <Screen>{null}</Screen>;
  const isLocked = secondsLeft > 0;
  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) + spacing.xxxl }]}>
      <Text variant="title" style={styles.title}>MPIN daalo</Text>
      <Text variant="body" style={styles.subtitle}>
        {isLocked ? `Bahut galat koshish. ${secondsLeft} second baad try karo.` : 'Kharchiva kholne ke liye apna 4 digit MPIN daalo.'}
      </Text>
      <View style={styles.input}>
        <MpinInput value={code} onChange={onChange} hasError={Boolean(message)} disabled={isLocked} accessibilityLabel="Enter MPIN" />
      </View>
      {message ? <Text variant="caption" style={styles.error}>{message}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Forgot MPIN" onPress={forgot} style={styles.forgot}>
        <Text variant="label" style={styles.forgotText}>MPIN bhool gaye?</Text>
      </Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { alignItems: 'center' },
  title: { fontSize: 26, lineHeight: 34, textAlign: 'center' },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  input: { marginTop: spacing.xxxl, width: '100%' },
  error: { color: colors.destructive, marginTop: spacing.lg, textAlign: 'center' },
  forgot: { marginTop: spacing.xxxl, padding: spacing.md },
  forgotText: { color: colors.primary },
});
