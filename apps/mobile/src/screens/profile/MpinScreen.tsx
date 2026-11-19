import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { MpinInput } from '../../components/MpinInput';
import { Screen } from '../../components/Screen';
import { showSnackbar } from '../../components/snackbar';
import { Text } from '../../components/Text';
import { getMpinStore } from '../../features/mpin/getMpinStore';
import { setMpinEnabled } from '../../features/mpin/mpinStatus';
import { MPIN_LENGTH, type MpinStore } from '../../features/mpin/mpinStore';
import type { RootStackParamList } from '../../navigation/types';
import { useLanguage } from '../../i18n/i18n';
import { colors, spacing } from '../../theme';
type Step = 'loading' | 'current' | 'menu' | 'new' | 'confirm';
const COPY: Record<Exclude<Step, 'loading' | 'menu'>, { title: string; hint: string }> = {
  current: { title: 'Current MPIN daalo', hint: 'Badlav karne se pehle purana MPIN batao.' },
  new: { title: 'Naya MPIN banao', hint: `${MPIN_LENGTH} digit ka MPIN chuno. Ye app kholne par poocha jayega.` },
  confirm: { title: 'MPIN dobara daalo', hint: 'Wahi MPIN ek baar aur daalo.' },
};
export function MpinScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<MpinStore | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [isSet, setIsSet] = useState(false);
  const [code, setCode] = useState('');
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    getMpinStore()
      .then(async mpinStore => {
        const hasMpin = await mpinStore.isSet();
        if (!active) return;
        setStore(mpinStore);
        setIsSet(hasMpin);
        setStep(hasMpin ? 'current' : 'new');
      })
      .catch(() => {
        if (!active) return;
        showSnackbar({ message: 'MPIN abhi nahi khul paya. Dobara try karo.', tone: 'error' });
        navigation.goBack();
      });
    return () => {
      active = false;
    };
  }, [navigation]);
  const finish = (message: string) => {
    showSnackbar({ message, tone: 'success' });
    navigation.goBack();
  };
  const fail = (message: string) => {
    setCode('');
    setError(message);
  };
  const handle = async (value: string) => {
    if (!store) return;
    if (step === 'current') {
      const result = await store.verify(value);
      if (result.ok) {
        setCode('');
        setStep('menu');
      } else if (result.lockedUntil) {
        fail('Bahut galat koshish. Thodi der baad try karo.');
      } else {
        fail(t('Galat MPIN. {n} koshish bachi hain.', { n: result.attemptsLeft }));
      }
    } else if (step === 'new') {
      setFirstEntry(value);
      setCode('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (value !== firstEntry) {
        setFirstEntry('');
        setStep('new');
        fail('MPIN match nahi hua. Dobara naya MPIN banao.');
        return;
      }
      await store.set(value);
      setMpinEnabled(true);
      finish(isSet ? 'MPIN badal diya' : 'MPIN set ho gaya');
    }
  };
  const onChange = (value: string) => {
    setCode(value);
    setError('');
    if (value.length !== MPIN_LENGTH || busy) return;
    setBusy(true);
    handle(value)
      .catch(() => fail('MPIN save nahi ho paya. Dobara try karo.'))
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (!store) return;
    store
      .remove()
      .then(() => {
        setMpinEnabled(false);
        finish('MPIN hata diya');
      })
      .catch(() => setError('MPIN hata nahi paya. Dobara try karo.'));
  };
  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={styles.flex}>
        <AppHeader title="MPIN" showBack onBack={() => navigation.goBack()} />
        {step === 'menu' ? (
          <View style={styles.content}>
            <Text variant="title" style={styles.title}>MPIN chalu hai</Text>
            <Text variant="body" style={styles.hint}>Kya karna hai?</Text>
            <View style={styles.actions}>
              <Button onPress={() => { setCode(''); setStep('new'); }}>Change MPIN</Button>
              <Button variant="secondary" onPress={remove}>Remove MPIN</Button>
            </View>
            {error ? <Text variant="caption" style={styles.error}>{error}</Text> : null}
          </View>
        ) : step === 'loading' ? null : (
          <View style={styles.content}>
            <Text variant="title" style={styles.title}>{COPY[step].title}</Text>
            <Text variant="body" style={styles.hint}>{step === 'new' ? t('{n} digit ka MPIN chuno. Ye app kholne par poocha jayega.', { n: MPIN_LENGTH }) : COPY[step].hint}</Text>
            <View style={styles.input}>
              <MpinInput value={code} onChange={onChange} hasError={Boolean(error)} disabled={busy} accessibilityLabel={COPY[step].title} />
            </View>
            {error ? <Text variant="caption" style={styles.error}>{error}</Text> : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: spacing.md },
  content: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl },
  title: { fontSize: 24, lineHeight: 32, textAlign: 'center' },
  hint: { color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  input: { marginTop: spacing.xxxl, width: '100%' },
  actions: { gap: spacing.md, marginTop: spacing.xxl, width: '100%' },
  error: { color: colors.destructive, marginTop: spacing.lg, textAlign: 'center' },
});
