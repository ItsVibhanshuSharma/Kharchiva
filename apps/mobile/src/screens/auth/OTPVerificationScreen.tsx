import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function OTPVerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <AppHeader
          title="OTP Verification"
          showBack
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.securityIcon} />
            <Text variant="title" style={styles.title}>Enter 6-digit code</Text>
            <Text variant="body" style={styles.description}>
              Demo preview only. No verification code is sent or checked.
            </Text>
          </View>

          <Card style={styles.notice}>
            <View style={styles.noticeIcon}>
              <Text style={styles.noticeGlyph}>···</Text>
            </View>
            <View style={styles.noticeCopy}>
              <Text variant="label">OTP demo</Text>
              <Text variant="caption">Continue to preview the app. No code is required.</Text>
            </View>
            <Text style={styles.lockIcon}>◇</Text>
          </Card>

          <View style={styles.codeRow}>
            {Array.from({ length: 6 }, (_, index) => (
              <View
                key={index}
                style={[styles.codeCell, index === code.length && styles.activeCell]}
              >
                <Text style={styles.codeDigit}>{code[index] || ''}</Text>
              </View>
            ))}
            <TextInput
              accessibilityLabel="One-time password"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={value => setCode(value.replace(/\D/g, ''))}
              style={styles.hiddenInput}
              value={code}
            />
          </View>
          <Text variant="caption" style={styles.resendText}>No code? This is a demo flow.</Text>

          <View style={styles.actions}>
            <Button onPress={() => navigation.navigate('ProfileSetup')}>
              Verify
            </Button>
          </View>

          <View style={styles.securityCard}>
            <View style={styles.securityBadge}>
              <Text style={styles.badgeGlyph}>◇</Text>
            </View>
            <View style={styles.securityCopy}>
              <Text variant="label">Demo mode</Text>
              <Text variant="caption">Nothing is sent or verified during this preview.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: spacing.md },
  content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  intro: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
  securityIcon: {
    height: 88,
    marginBottom: spacing.lg,
    width: 88,
  },
  title: { fontSize: 28, lineHeight: 36, marginBottom: spacing.sm, textAlign: 'center' },
  description: { color: colors.textMuted, textAlign: 'center' },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.md,
  },
  noticeIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  noticeGlyph: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  noticeCopy: { flex: 1 },
  lockIcon: { color: colors.textMuted, fontSize: 20 },
  codeRow: { flexDirection: 'row', gap: spacing.sm, position: 'relative' },
  codeCell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    height: 68,
    justifyContent: 'center',
  },
  activeCell: { borderColor: colors.primary },
  codeDigit: { color: colors.text, fontSize: 28, fontWeight: '600' },
  hiddenInput: {
    bottom: 0,
    color: 'transparent',
    opacity: 0.02,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  resendText: { color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  actions: { marginTop: spacing.xxl },
  securityCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  securityBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  badgeGlyph: { color: colors.success, fontSize: 24 },
  securityCopy: { flex: 1 },
});
