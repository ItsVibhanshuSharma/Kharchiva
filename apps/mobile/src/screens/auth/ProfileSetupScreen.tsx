import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { UserRound } from '../../components/icons';
import { bottomSafeAreaInset } from '../../components/layoutInsets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { initialsOf } from '../profile/profileData';

export function ProfileSetupScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const initials = initialsOf(name.trim());
  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <AppHeader
          title="Personal Profile Setup"
          showBack
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progress}>
            <View style={styles.progressLabels}>
              <Text variant="label" style={styles.stepText}>PROFILE SETUP</Text>
              <Text variant="caption">Basics</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>
          <Text variant="title" style={styles.title}>Let&apos;s get to know you</Text>
          <Text variant="body" style={styles.description}>
            Personalize your Kharchiva experience. Add a few details to get started.
          </Text>
          <Card style={styles.profileCard}>
            <View style={styles.avatar}>
              {/* Shows the initials as the name is typed. */}
              {initials ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <UserRound color={colors.primary} size={26} strokeWidth={2.2} />
              )}
            </View>
            <View style={styles.profileCopy}>
              <Text variant="label">Your profile</Text>
              <Text variant="caption">Add your preferred name below</Text>
            </View>
          </Card>
          <View style={styles.form}>
            <Input
              label="Your Preferred Name"
              maxLength={40}
              onChangeText={setName}
              placeholder="Vibhanshu Sharma"
              value={name}
            />
            <Input label="Date of birth" keyboardType="number-pad" maxLength={14} placeholder="DD / MM / YYYY" />
            <View>
              <Text variant="label" style={styles.fieldLabel}>Preferred currency</Text>
              <View style={styles.currencyField}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencySymbol}>₹</Text>
                </View>
                <Text variant="body" style={styles.currencyName}>Indian Rupee (INR)</Text>
              </View>
            </View>
          </View>
          <Text variant="caption" style={styles.privacy}>◇  Demo preview · Profile details are not submitted.</Text>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.md }]}>
          <Button onPress={() => navigation.navigate('Home')}>
            Continue
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
  progress: { marginBottom: spacing.xxl, marginTop: spacing.lg },
  progressLabels: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepText: { color: colors.primary, letterSpacing: 0.5 },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 6,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: colors.primary, borderRadius: radius.full, height: '100%', width: '100%' },
  title: { fontSize: 28, lineHeight: 36, marginBottom: spacing.sm },
  description: { color: colors.textMuted, marginBottom: spacing.xl },
  profileCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  profileCopy: { flex: 1, gap: 2 },
  form: { gap: spacing.lg },
  fieldLabel: { color: colors.text, marginBottom: spacing.sm },
  currencyField: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencyBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  currencySymbol: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  currencyName: { color: colors.text, flex: 1 },
  privacy: { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xs, paddingTop: spacing.md },
});
