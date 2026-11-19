import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { bottomSafeAreaInset } from '../../components/layoutInsets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

const CODE_LENGTH = 6;

export function OTPVerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
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
            <BrandMark size={72} />
            <Text variant="title" style={styles.title}>Enter 6-digit code</Text>
            <Text variant="body" style={styles.description}>
              Demo preview only. No verification code is sent or checked.
            </Text>
          </View>
          <View style={styles.codeRow}>
            {Array.from({ length: CODE_LENGTH }, (_, index) => {
              const filled = index < code.length;
              const active = focused && index === Math.min(code.length, CODE_LENGTH - 1);
              return (
                <View
                  key={index}
                  style={[styles.codeCell, filled && styles.filledCell, active && styles.activeCell]}
                >
                  <Text style={styles.codeDigit}>{code[index] || ''}</Text>
                </View>
              );
            })}
            <TextInput
              accessibilityLabel="One-time password"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              onBlur={() => setFocused(false)}
              onChangeText={value => setCode(value.replace(/\D/g, ''))}
              onFocus={() => setFocused(true)}
              style={styles.hiddenInput}
              value={code}
            />
          </View>
          <Text variant="caption" style={styles.resendText}>No code? This is a demo flow.</Text>
          <View style={styles.notice}>
            <View style={styles.noticeIcon}>
              <Text style={styles.noticeGlyph}>◇</Text>
            </View>
            <View style={styles.noticeCopy}>
              <Text variant="label">OTP demo</Text>
              <Text variant="caption">Continue to preview the app. No code is required.</Text>
            </View>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.md }]}>
          <Button onPress={() => navigation.navigate('ProfileSetup')}>
            Verify
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: 0 },
  content: { flexGrow: 1, paddingBottom: spacing.lg, paddingHorizontal: spacing.xs },
  intro: { alignItems: 'center', marginBottom: spacing.xxl, marginTop: spacing.xl },
  title: { fontSize: 28, lineHeight: 36, marginBottom: spacing.sm, marginTop: spacing.lg, textAlign: 'center' },
  description: { color: colors.textMuted, maxWidth: 320, textAlign: 'center' },
  codeRow: { flexDirection: 'row', gap: spacing.sm, position: 'relative' },
  codeCell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flex: 1,
    height: 64,
    justifyContent: 'center',
  },
  filledCell: { backgroundColor: colors.selected, borderColor: colors.primaryMuted },
  activeCell: { borderColor: colors.primary },
  codeDigit: { color: colors.text, fontSize: 26, fontWeight: '700' },
  hiddenInput: {
    bottom: 0,
    color: 'transparent',
    left: 0,
    opacity: 0.02,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  resendText: { color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  noticeIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  noticeGlyph: { color: colors.primary, fontSize: 24 },
  noticeCopy: { flex: 1, gap: 2 },
  footer: { paddingHorizontal: spacing.xs, paddingTop: spacing.md },
});
