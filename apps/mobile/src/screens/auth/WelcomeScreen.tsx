import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function WelcomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandIcon} />
          <Text variant="title" style={styles.brandName}>Kharchiva</Text>
          <Text variant="heading" style={styles.tagline}>Your money, made simple.</Text>
          <Text variant="body" style={styles.description}>
            Record your money in seconds. Understand your money over time.
          </Text>
        </View>

        <Card style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View style={styles.activityLabel}>
              <View style={styles.boltIcon}>
                <Text style={styles.boltText}>↯</Text>
              </View>
              <Text variant="caption" style={styles.eyebrow}>FRICTIONLESS LOG</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text variant="caption" style={styles.liveText}>Just now</Text>
            </View>
          </View>

          <View style={styles.expensePreview}>
            <View style={styles.teaIcon}>
              <View style={styles.cup}>
                <View style={styles.cupHandle} />
              </View>
            </View>
            <View style={styles.expenseDetails}>
              <Text variant="heading">Chai &amp; Snacks</Text>
              <Text variant="caption">Tap to see instant total</Text>
            </View>
            <View style={styles.amountDetails}>
              <Text variant="caption">Daily</Text>
              <Text variant="money" style={styles.amount}>₹240</Text>
              <Text variant="caption" style={styles.logged}>✓ Logged</Text>
            </View>
          </View>

          <View style={styles.quickEntries}>
            <Text variant="label" style={styles.quickChip}>+₹20 Chai</Text>
            <Text variant="label" style={styles.quickChip}>+₹150 Snack</Text>
            <Text variant="label" style={styles.resetText}>↻ Reset</Text>
          </View>
        </Card>

        <View style={styles.features}>
          <Card style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureGlyph}>◷</Text>
            </View>
            <Text variant="heading">2 Seconds</Text>
            <Text variant="caption">Zero waiting or bank lag. Add expense and carry on.</Text>
          </Card>
          <Card style={styles.featureCard}>
            <View style={styles.insightIcon}>
              <Text style={styles.featureGlyph}>✦</Text>
            </View>
            <Text variant="heading">Quiet Insights</Text>
            <Text variant="caption">Clarity over monthly burn with peaceful calm graphs.</Text>
          </Card>
        </View>

        <View style={styles.actions}>
          <Button onPress={() => navigation.navigate('PhoneVerification')}>
            Get started
          </Button>
          <Button
            onPress={() => navigation.navigate('PhoneVerification')}
            variant="secondary"
            style={styles.secondaryButton}
          >
            I already have an account
          </Button>
          <Text variant="caption" style={styles.subtleText}>♙  Demo preview · No account details are submitted.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: spacing.md,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandIcon: {
    height: 76,
    marginBottom: spacing.sm,
    width: 76,
  },
  brandName: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  tagline: {
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 340,
  },
  activityCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  activityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  activityLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  boltIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  boltText: {
    color: colors.primary,
    fontSize: 22,
  },
  eyebrow: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  liveDot: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  liveText: {
    color: colors.text,
  },
  expensePreview: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  teaIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  cup: {
    borderColor: colors.primary,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderWidth: 2,
    height: 22,
    position: 'relative',
    width: 22,
  },
  cupHandle: {
    borderColor: colors.primary,
    borderBottomRightRadius: radius.sm,
    borderRightWidth: 2,
    borderTopRightRadius: radius.sm,
    borderTopWidth: 2,
    height: 10,
    position: 'absolute',
    right: -8,
    top: 3,
    width: 7,
  },
  expenseDetails: {
    flex: 1,
  },
  amountDetails: {
    alignItems: 'flex-end',
  },
  amount: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
  },
  logged: {
    color: colors.success,
  },
  quickEntries: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resetText: {
    color: colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  features: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  featureCard: {
    flex: 1,
    padding: spacing.md,
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: colors.successMuted,
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 38,
  },
  insightIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 38,
  },
  featureGlyph: {
    color: colors.primary,
    fontSize: 20,
  },
  actions: {
    alignSelf: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surfaceMuted,
  },
  subtleText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
