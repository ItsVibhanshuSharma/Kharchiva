import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { bottomSafeAreaInset } from '../../components/layoutInsets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function PhoneVerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState(false);
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
          contentContainerStyle={[styles.content, { paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <BrandMark size={72} />
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
              <Text variant="label" style={styles.demoBadge}>◇  Demo only</Text>
            </View>
            <View style={[styles.numberField, focused && styles.numberFieldFocused]}>
              <Text variant="body" style={styles.countryCode}>🇮🇳  +91</Text>
              <View style={styles.divider} />
              <Input
                autoCapitalize="none"
                autoComplete="tel"
                keyboardType="phone-pad"
                maxLength={11}
                onBlur={() => setFocused(false)}
                onFocus={() => setFocused(true)}
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
          {/* The spacer pushes the terms line to the bottom on tall screens. */}
          <View style={styles.spacer} />
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
  screen: { paddingBottom: 0 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xs },
  intro: { alignItems: 'center', marginBottom: spacing.xxl, marginTop: spacing.xl },
  title: { fontSize: 28, lineHeight: 36, marginBottom: spacing.sm, marginTop: spacing.lg, textAlign: 'center' },
  description: { color: colors.textMuted, maxWidth: 320, textAlign: 'center' },
  formCard: { borderRadius: radius.xl, gap: spacing.lg, padding: spacing.lg },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  demoBadge: {
    backgroundColor: colors.successMuted,
    borderRadius: radius.full,
    color: colors.success,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  numberField: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  numberFieldFocused: { backgroundColor: colors.surface, borderColor: colors.primary },
  countryCode: { color: colors.text, fontWeight: '600' },
  divider: { backgroundColor: colors.border, height: 32, marginHorizontal: spacing.md, width: 1 },
  inputContainer: { flex: 1 },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 18,
    letterSpacing: 0.5,
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
    marginTop: spacing.lg,
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
  spacer: { flexGrow: 1, minHeight: spacing.xl },
  disclaimer: { color: colors.textMuted, textAlign: 'center' },
});
