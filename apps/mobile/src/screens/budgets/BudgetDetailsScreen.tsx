import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavigation } from '../../components/BottomNavigation';
import { BOTTOM_NAVIGATION_CONTENT_INSET } from '../../components/layoutInsets';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import {
  budgetCategories,
  budgetOverview,
  budgetReflections,
} from './budgetData';

function ProgressTrack({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  return (
    <View
      accessibilityLabel={`${progress}% used`}
      style={styles.progressTrack}
    >
      <View
        style={[
          styles.progressFill,
          { backgroundColor: color, width: `${Math.min(progress, 100)}%` },
        ]}
      />
    </View>
  );
}

function CategoryBudgetCard({
  category,
}: {
  category: (typeof budgetCategories)[number];
}) {
  return (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryMain}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: category.iconBackground },
          ]}
        >
          <Text style={[styles.categoryGlyph, { color: category.iconColor }]}>
            {category.icon}
          </Text>
        </View>

        <View style={styles.categoryDetails}>
          <Text numberOfLines={1} style={styles.categoryName}>
            {category.name}
          </Text>
          <Text style={styles.categoryAmounts}>
            {category.spentAmount} of {category.budgetAmount}
          </Text>
        </View>

        <View style={styles.categoryStatus}>
          <Text style={styles.categoryBudgetAmount}>
            {category.remainingAmount}
          </Text>
          {category.statusLabel ? (
            <View
              style={[
                styles.statusBadge,
                category.status === 'near' && styles.nearBadge,
                category.status === 'healthy' && styles.healthyBadge,
                category.status === 'completed' && styles.completedBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  category.status === 'near' && styles.nearText,
                  category.status === 'healthy' && styles.healthyText,
                ]}
              >
                {category.statusLabel}
              </Text>
            </View>
          ) : (
            <Text style={styles.usedText}>{category.progressLabel}</Text>
          )}
        </View>
      </View>

      <View style={styles.categoryCardProgress}>
        <ProgressTrack
          color={category.progressColor}
          progress={category.progress}
        />
      </View>

      <View style={styles.categoryFooter}>
        <View style={styles.footerNote}>
          <Text
            style={[
              styles.footerIcon,
              category.status === 'near' && styles.nearText,
              category.status === 'healthy' && styles.healthyText,
              category.status === 'completed' && styles.healthyText,
            ]}
          >
            {category.footerIcon}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.footerText,
              category.status === 'near' && styles.nearText,
              category.status === 'completed' && styles.healthyText,
            ]}
          >
            {category.footerLeft}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.footerRight}>
          {category.footerRight}
        </Text>
      </View>
    </Card>
  );
}

export function BudgetDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, spacing.md),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Budget Details
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More budget options"
            style={styles.moreButton}
          >
            <Text style={styles.moreGlyph}>⋮</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            <Text style={styles.profileGlyph}>♙</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View style={styles.introMeta}>
            <Text style={styles.eyebrow}>PLANNING &amp; LIMITS</Text>
            <View style={styles.periodBadge}>
              <Text style={styles.periodGlyph}>▦</Text>
              <Text style={styles.periodText}>{budgetOverview.period}</Text>
            </View>
          </View>
          <Text style={styles.title}>Budget Overview</Text>
          <Text style={styles.subtitle}>
            Stay quietly on track with your monthly spending.
          </Text>
        </View>

        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeading}>
            <Text style={styles.overviewLabel}>TOTAL MONTHLY BUDGET</Text>
            <View style={styles.remainingBadge}>
              <Text style={styles.remainingText}>
                {budgetOverview.remaining}
              </Text>
            </View>
          </View>

          <View style={styles.overviewAmounts}>
            <View style={styles.amountLine}>
              <Text style={styles.spentAmount}>{budgetOverview.spent}</Text>
              <Text style={styles.totalAmount}>/ {budgetOverview.total}</Text>
            </View>
            <Text style={styles.percentUsed}>{budgetOverview.used}</Text>
          </View>

          <ProgressTrack color={colors.primary} progress={87} />

          <View style={styles.onTrackPanel}>
            <View style={styles.checkIcon}>
              <Text style={styles.checkGlyph}>✓</Text>
            </View>
            <View style={styles.onTrackCopy}>
              <Text style={styles.onTrackTitle}>You're on track</Text>
              <Text style={styles.onTrackDescription}>
                Daily safe pace is <Text style={styles.inlineStrong}>{budgetOverview.pace}</Text> for the
                remaining {budgetOverview.daysLeft}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.categoriesHeading}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add budget"
            style={styles.addBudgetButton}
          >
            <Text style={styles.addGlyph}>＋</Text>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.categoryList}>
          {budgetCategories.map(category => (
            <CategoryBudgetCard category={category} key={category.id} />
          ))}
        </View>

        <View style={styles.reflectionCard}>
          <View style={styles.reflectionIcon}>
            <Text style={styles.reflectionGlyph}>♧</Text>
          </View>
          <View style={styles.reflectionCopy}>
            <Text style={styles.reflectionTitle}>
              {budgetReflections.monthlyTitle}
            </Text>
            <Text style={styles.reflectionText}>
              Last month you stayed <Text style={styles.inlineStrong}>₹1,400 under budget.</Text> At your
              current pace, you will finish September comfortably within your
              ₹40,000 target.
            </Text>
          </View>
        </View>

        <Card style={styles.habitCard}>
          <View style={styles.habitIcon}>
            <Text style={styles.habitGlyph}>☼</Text>
          </View>
          <View style={styles.habitCopy}>
            <Text style={styles.habitTitle}>{budgetReflections.habitTitle}</Text>
            <Text style={styles.habitText}>
              You stayed <Text style={styles.inlineStrong}>₹1,400 under budget</Text> last month. Your
              disciplined pacing keeps your discretionary expenses completely
              in control.
            </Text>
          </View>
        </Card>

        <Button style={styles.adjustButton}>☷  Adjust Budgets</Button>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download Monthly Statement"
          style={styles.downloadButton}
        >
          <Text style={styles.downloadText}>Download Monthly Statement</Text>
        </Pressable>
      </ScrollView>

      <BottomNavigation
        onSelect={id => {
          if (id === 'home') {
            navigation.navigate('Home');
          } else if (id === 'transactions') {
            navigation.navigate('Transactions');
          } else if (id === 'add') {
            navigation.navigate('AddExpense');
          } else if (id === 'reports') {
            navigation.navigate('Reports');
          } else if (id === 'profile') {
            navigation.navigate('Profile');
          }
        }}
        items={[
          { id: 'home', label: 'Home' },
          { id: 'transactions', label: 'Transaction' },
          { id: 'add', label: '+' },
          { id: 'reports', label: 'Report' },
          { id: 'profile', label: 'Profile' },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    alignItems: 'flex-start',
    height: 40,
    justifyContent: 'center',
    width: 32,
  },
  backGlyph: { color: colors.text, fontSize: 34, lineHeight: 38 },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  moreButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 24 },
  moreGlyph: { color: colors.textMuted, fontSize: 22, fontWeight: '700' },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  profileGlyph: { color: colors.white, fontSize: 20, lineHeight: 25 },
  scrollView: { flex: 1 },
  content: {
    paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  intro: { marginBottom: spacing.xl },
  introMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  eyebrow: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.5 },
  periodBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  periodGlyph: { color: colors.primary, fontSize: 12 },
  periodText: { color: colors.textMuted, fontSize: 10 },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 34,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  overviewCard: {
    borderColor: '#F0EEEB',
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  overviewHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewLabel: { color: colors.text, fontSize: 10, letterSpacing: 0.3 },
  remainingBadge: {
    backgroundColor: '#E6F3EE',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  remainingText: { color: colors.success, fontSize: 11, fontWeight: '600' },
  overviewAmounts: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  amountLine: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.xs },
  spentAmount: { color: colors.text, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  totalAmount: { color: colors.textMuted, fontSize: 13 },
  percentUsed: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  progressTrack: {
    backgroundColor: '#ECEBE7',
    borderRadius: radius.full,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: { borderRadius: radius.full, height: '100%' },
  onTrackPanel: {
    alignItems: 'flex-start',
    backgroundColor: '#F3F4EF',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  checkIcon: {
    alignItems: 'center',
    backgroundColor: '#65EAC0',
    borderRadius: radius.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkGlyph: { color: '#075C43', fontSize: 16, fontWeight: '700' },
  onTrackCopy: { flex: 1, minWidth: 0 },
  onTrackTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  onTrackDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  inlineStrong: { color: colors.success, fontWeight: '600' },
  categoriesHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  addBudgetButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addGlyph: { color: colors.primary, fontSize: 16, lineHeight: 18 },
  addText: { color: colors.primary, fontSize: 12 },
  categoryList: { gap: spacing.sm },
  categoryCard: {
    borderColor: '#F0EEEB',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  categoryMain: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  categoryGlyph: { fontSize: 17, fontWeight: '700' },
  categoryDetails: { flex: 1, minWidth: 0 },
  categoryName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  categoryAmounts: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  categoryStatus: { alignItems: 'flex-end', marginLeft: spacing.xs },
  categoryBudgetAmount: { color: colors.text, fontSize: 14, fontWeight: '600' },
  usedText: { color: colors.success, fontSize: 10, marginTop: spacing.xs },
  statusBadge: {
    borderRadius: radius.full,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  nearBadge: { backgroundColor: '#FFE0B8' },
  healthyBadge: { backgroundColor: '#65EAC0' },
  completedBadge: { backgroundColor: '#E9E8E5' },
  statusText: { color: colors.text, fontSize: 9, letterSpacing: 0.3 },
  nearText: { color: '#80500A' },
  healthyText: { color: colors.success },
  categoryCardProgress: { marginTop: spacing.md },
  categoryFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  footerNote: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, flex: 1 },
  footerIcon: { color: colors.success, fontSize: 12 },
  footerText: { color: colors.textMuted, fontSize: 10 },
  footerRight: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: spacing.xs,
    textAlign: 'right',
  },
  reflectionCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F3F4EF',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  reflectionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  reflectionGlyph: { color: colors.primary, fontSize: 19 },
  reflectionCopy: { flex: 1, minWidth: 0 },
  reflectionTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  reflectionText: { color: colors.text, fontSize: 12, lineHeight: 19, marginTop: spacing.xs },
  habitCard: {
    borderColor: '#F0EEEB',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  habitIcon: {
    alignItems: 'center',
    backgroundColor: '#65EAC0',
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  habitGlyph: { color: colors.success, fontSize: 19 },
  habitCopy: { flex: 1, minWidth: 0 },
  habitTitle: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  habitText: { color: colors.text, fontSize: 12, lineHeight: 19, marginTop: spacing.xs },
  adjustButton: { marginTop: spacing.lg, minHeight: 52 },
  downloadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  downloadText: { color: colors.text, fontSize: 12 },
});
