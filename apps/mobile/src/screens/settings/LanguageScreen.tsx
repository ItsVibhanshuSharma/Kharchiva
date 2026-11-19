import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Check } from '../../components/icons';
import { setLanguage, useLanguage } from '../../i18n/i18n';
import { LANGUAGES } from '../../i18n/languages';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language } = useLanguage();
  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title="Language" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption">Choose the language you want to use in the app.</Text>
        {LANGUAGES.map(item => {
          const selected = item.code === language;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.englishName}
              accessibilityState={{ selected }}
              key={item.code}
              onPress={() => setLanguage(item.code)}
              style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
            >
              <View style={styles.names}>
                <Text variant="label" style={styles.nativeName}>{item.nativeName}</Text>
                <Text variant="caption">{item.englishName}</Text>
              </View>
              {selected ? <Check color={colors.primary} size={22} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.sm, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  cardSelected: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  names: { flex: 1, gap: 2 },
  nativeName: { color: colors.text, fontSize: 17 },
  pressed: { opacity: 0.7 },
});
