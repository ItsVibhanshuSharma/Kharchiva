import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function PhoneVerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <AppHeader
          title="Phone Verification"
          showBack
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandTile} />
            <Text variant="title" style={styles.title}>
              Welcome to Kharchiva
            </Text>
            <Text variant="body" style={styles.description}>
              Enter your mobile number to continue through the demo sign-in flow.
            </Text>
          </View>

          <Card style={styles.formCard}>
            <View style={styles.labelRow}>
              <Text variant="label">Mobile Number</Text>
              <Text variant="label" style={styles.encrypted}>◇  Demo only</Text>
            </View>
            <View style={styles.numberField}>
              <Text variant="body" style={styles.countryCode}>🇮🇳  +91</Text>
              <View style={styles.divider} />
              <Input
                autoCapitalize="none"
                autoComplete="tel"
                keyboardType="phone-pad"
                placeholder="98765 43210"
                containerStyle={styles.inputContainer}
                style={styles.input}
              />
            </View>
            <Button onPress={() => navigation.navigate('OTPVerification')}>
              Send OTP
            </Button>
            <Text variant="caption" style={styles.privacy}>
              ♙  Demo mode: no OTP will be sent. Continue to preview the sign-in flow.
            </Text>
          </Card>

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityGlyph}>◇</Text>
            </View>
            <View style={styles.securityCopy}>
              <Text variant="heading" style={styles.securityTitle}>Demo sign-in</Text>
              <Text variant="body" style={styles.securityBody}>
                Phone verification is not connected in this preview.
              </Text>
            </View>
          </View>
          <Text variant="caption" style={styles.disclaimer}>
            By continuing, you agree to Kharchiva&apos;s Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: spacing.md },
  content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  intro: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg },
  brandTile: {
    height: 88,
    marginBottom: spacing.lg,
    width: 88,
  },
  title: { fontSize: 28, lineHeight: 36, marginBottom: spacing.sm, textAlign: 'center' },
  description: { color: colors.textMuted, maxWidth: 360, textAlign: 'center' },
  formCard: { borderRadius: radius.xl, gap: spacing.lg, padding: spacing.lg },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  encrypted: { color: colors.success },
  numberField: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  countryCode: { color: colors.text, fontWeight: '600' },
  divider: { backgroundColor: colors.border, height: 32, marginHorizontal: spacing.md, width: 1 },
  inputContainer: { flex: 1 },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
  },
  privacy: { color: colors.textMuted, textAlign: 'center' },
  securityCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  securityIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  securityGlyph: { color: colors.primary, fontSize: 26 },
  securityCopy: { flex: 1 },
  securityTitle: { fontSize: 17, lineHeight: 24 },
  securityBody: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  disclaimer: { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
});
