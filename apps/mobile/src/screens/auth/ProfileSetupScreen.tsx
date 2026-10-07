import React from 'react';
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
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function ProfileSetupScreen() {
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
              <Text style={styles.avatarText}>VS</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text variant="label">Your profile</Text>
              <Text variant="caption">Add your preferred name below</Text>
            </View>
          </Card>

          <View style={styles.form}>
            <Input label="Your Preferred Name" placeholder="Vibhanshu Sharma" />
            <Input label="Date of birth" placeholder="DD / MM / YYYY" />
            <View style={styles.currencyCard}>
              <Text variant="label">Preferred currency</Text>
              <Input
                placeholder="Indian Rupee (INR)"
                style={styles.input}
              />
            </View>
          </View>

          <Button onPress={() => navigation.navigate('Home')}>
            Continue
          </Button>
          <Text variant="caption" style={styles.privacy}>◇  Demo preview · Profile details are not submitted.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: spacing.md },
  content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  progress: { marginBottom: spacing.xl, marginTop: spacing.lg },
  progressLabels: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepText: { color: colors.primary },
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
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: '600' },
  profileCopy: { flex: 1 },
  form: { gap: spacing.lg, marginBottom: spacing.xl },
  currencyCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: { marginTop: 0 },
  privacy: { color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
});
