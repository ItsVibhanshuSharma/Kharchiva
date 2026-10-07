import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import {
  monthlyTrend,
  paymentChannels,
  reportPeriods,
  reportSummary,
  spendingCategories,
} from './reportsData';
import type { ReportPeriod } from './reportsData';

function TrendChart() {
  return (
    <View
      accessibilityLabel="Monthly spending trend"
      style={styles.trendCard}
    >
      <View style={styles.trendMarker}>
        <Text style={styles.trendMarkerText}>↘</Text>
      </View>
      <View style={styles.trendChart}>
        {monthlyTrend.map((period, index) => (
          <View key={period.label} style={styles.trendColumn}>
            <View style={styles.trendBarTrack}>
              <View
                style={[
                  styles.trendBar,
                  index === monthlyTrend.length - 1 && styles.currentTrendBar,
                  { height: `${period.value}%` },
                ]}
              />
            </View>
            <Text style={styles.trendLabel}>{period.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SpendingBreakdown() {
  return (
    <Card style={styles.breakdownCard}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Where your money went</Text>
          <Text style={styles.sectionSubtitle}>5 primary expense categories</Text>
        </View>
        <Text accessibilityLabel="Sort categories" style={styles.sortGlyph}>
          ↕
        </Text>
      </View>

      <View
        accessibilityLabel="Category spending proportions"
        style={styles.categoryBar}
      >
        {spendingCategories.map(category => (
          <View
            key={category.id}
            style={[
              styles.categorySegment,
              { backgroundColor: category.color, flex: category.percentage },
            ]}
          />
        ))}
        <View style={[styles.categorySegment, styles.otherSegment]} />
      </View>

      <View style={styles.categoryList}>
        {spendingCategories.map(category => (
          <View key={category.id} style={styles.categoryRow}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: category.backgroundColor },
              ]}
            >
              <Text style={[styles.categoryGlyph, { color: category.color }]}>
                {category.icon}
              </Text>
            </View>
            <View style={styles.categoryInfo}>
              <Text numberOfLines={1} style={styles.categoryName}>
                {category.name}
              </Text>
              <Text numberOfLines={1} style={styles.categoryDetail}>
                {category.detail}
              </Text>
            </View>
            <View style={styles.categoryAmountBlock}>
              <Text style={styles.categoryAmount}>{category.amount}</Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryNote,
                  category.id === 'food' && styles.positiveNote,
                ]}
              >
                {category.note}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function PaymentChannels() {
  return (
    <Card style={styles.paymentCard}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Payment Channels</Text>
          <Text style={styles.sectionSubtitle}>Modes used this billing period</Text>
        </View>
        <View style={styles.paymentGlyph}>
          <Text style={styles.paymentGlyphText}>▤</Text>
        </View>
      </View>
      <View style={styles.paymentContent}>
        <View style={styles.paymentBar}>
          {paymentChannels.map(channel => (
            <View
              key={channel.id}
              style={[
                styles.paymentSegment,
                {
                  backgroundColor: channel.color,
                  flex: channel.percentage,
                },
              ]}
            />
          ))}
        </View>
        {paymentChannels.map(channel => (
          <View key={channel.id} style={styles.paymentRow}>
            <View style={styles.paymentName}>
              <View
                style={[
                  styles.paymentDot,
                  { backgroundColor: channel.color },
                ]}
              />
              <Text style={styles.paymentLabel}>{channel.label}</Text>
            </View>
            <Text style={styles.paymentPercentage}>{channel.percentage}%</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ReportAction({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.actionRow}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text numberOfLines={1} style={styles.actionText}>
        {label}
      </Text>
      <Text style={styles.actionArrow}>→</Text>
    </Pressable>
  );
}

export function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedPeriod, setSelectedPeriod] =
    useState<ReportPeriod>('This month');

  return (
    <Screen
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, spacing.md),
        },
      ]}
    >
      <View style={styles.brandHeader}>
        <View style={styles.brandLockup}>
          <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandIcon} />
          <View>
            <Text style={styles.brandName}>Kharchiva</Text>
            <Text style={styles.brandSubtitle}>Financial Reports</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.notificationButton}
          >
            <View style={styles.bellIcon}>
              <View style={styles.bellBody} />
              <View style={styles.bellBase} />
              <View style={styles.bellClapper} />
            </View>
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
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>FINANCIAL STORY &amp; INSIGHTS</Text>
          <Text style={styles.screenTitle}>Reports</Text>
          <Text style={styles.screenSubtitle}>
            Understand where your money flowed with quiet composure.
          </Text>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.periods}
          showsHorizontalScrollIndicator={false}
        >
          {reportPeriods.map(period => {
            const isSelected = selectedPeriod === period;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={period}
                accessibilityState={{ selected: isSelected }}
                key={period}
                onPress={() => setSelectedPeriod(period)}
                style={[
                  styles.periodChip,
                  isSelected && styles.selectedPeriodChip,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.periodText,
                    isSelected && styles.selectedPeriodText,
                  ]}
                >
                  {period}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeading}>
            <Text style={styles.summaryLabel}>SPENT THIS MONTH</Text>
            <View style={styles.comparisonBadge}>
              <Text style={styles.comparisonText}>
                ↓ {reportSummary.comparison}
              </Text>
            </View>
          </View>
          <Text style={styles.spentAmount}>{reportSummary.spent}</Text>
          <View style={styles.summaryFooter}>
            <View style={styles.summaryMetric}>
              <Text style={styles.metricLabel}>Total Income</Text>
              <Text style={styles.incomeAmount}>↑ {reportSummary.income}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.metricLabel}>Available Margin</Text>
              <Text style={styles.marginAmount}>
                ▣ {reportSummary.availableMargin}
              </Text>
            </View>
          </View>
        </Card>

        <TrendChart />
        <SpendingBreakdown />
        <PaymentChannels />

        <View style={styles.actions}>
          <ReportAction
            icon="▣"
            label="View Monthly Comparison"
          />
          <ReportAction
            icon="↓"
            label="Export Statement (CSV / PDF)"
          />
        </View>
      </ScrollView>

      <BottomNavigation
        onSelect={id => {
          if (id === 'home') {
            navigation.navigate('Home');
          } else if (id === 'transactions') {
            navigation.navigate('Transactions');
          } else if (id === 'add') {
            navigation.navigate('AddExpense');
          } else if (id === 'profile') {
            navigation.navigate('Profile');
          }
        }}
        items={[
          { id: 'home', label: 'Home' },
          { id: 'transactions', label: 'Transaction' },
          { id: 'add', label: '+' },
          { id: 'reports', label: 'Report', active: true },
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
  scrollView: { flex: 1 },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brandLockup: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  brandIcon: {height: 36, width: 36},
  brandName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  brandSubtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 14 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  notificationButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 30,
  },
  bellIcon: { alignItems: 'center', height: 23, justifyContent: 'flex-end' },
  bellBody: {
    borderColor: colors.text,
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    borderWidth: 1.5,
    height: 16,
    width: 14,
  },
  bellBase: {
    backgroundColor: colors.text,
    borderRadius: radius.full,
    height: 1.5,
    marginTop: 1,
    width: 18,
  },
  bellClapper: {
    backgroundColor: colors.text,
    borderRadius: radius.full,
    height: 3,
    marginTop: 1,
    width: 3,
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  profileGlyph: { color: colors.white, fontSize: 22, lineHeight: 28 },
  content: {
    paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  titleBlock: { marginBottom: spacing.md },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
  screenSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
  },
  periods: { gap: spacing.xs, paddingBottom: spacing.lg },
  periodChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.md,
  },
  selectedPeriodChip: { backgroundColor: colors.primary },
  periodText: { color: colors.text, fontSize: 12 },
  selectedPeriodText: { color: colors.white },
  summaryCard: {
    borderColor: '#F1EFEC',
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    minHeight: 178,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  summaryHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  comparisonBadge: {
    backgroundColor: colors.successMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  comparisonText: { color: colors.success, fontSize: 10, fontWeight: '600' },
  spentAmount: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 34,
    marginTop: spacing.md,
  },
  summaryFooter: {
    backgroundColor: '#F8F7F4',
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  summaryMetric: { flex: 1, minWidth: 0 },
  metricLabel: { color: colors.textMuted, fontSize: 10 },
  incomeAmount: { color: colors.success, fontSize: 16, fontWeight: '600' },
  marginAmount: { color: colors.text, fontSize: 14, fontWeight: '600' },
  trendCard: {
    backgroundColor: '#F0EFEC',
    borderRadius: radius.md,
    height: 166,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
  trendMarker: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  trendMarkerText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  trendChart: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  trendColumn: { alignItems: 'center', flex: 1, height: '100%' },
  trendBarTrack: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  trendBar: {
    backgroundColor: '#D5C3F5',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    maxWidth: 14,
    minHeight: 8,
    width: '55%',
  },
  currentTrendBar: { backgroundColor: colors.primary },
  trendLabel: { color: colors.textMuted, fontSize: 9, marginTop: spacing.xs },
  breakdownCard: { borderRadius: radius.md, marginBottom: spacing.lg, padding: spacing.lg },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sectionSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  sortGlyph: { color: colors.primary, fontSize: 19, fontWeight: '700' },
  categoryBar: {
    borderRadius: radius.full,
    flexDirection: 'row',
    height: 9,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  categorySegment: { height: '100%' },
  otherSegment: { backgroundColor: '#E5E4E0', flex: 5 },
  categoryList: { gap: spacing.xs },
  categoryRow: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 34,
  },
  categoryGlyph: { fontSize: 17, fontWeight: '700' },
  categoryInfo: { flex: 1, minWidth: 0 },
  categoryName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  categoryDetail: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  categoryAmountBlock: { alignItems: 'flex-end', marginLeft: spacing.xs },
  categoryAmount: { color: colors.text, fontSize: 14, fontWeight: '600' },
  categoryNote: { color: colors.textMuted, fontSize: 9, lineHeight: 13 },
  positiveNote: { color: colors.success },
  paymentCard: { borderRadius: radius.md, marginBottom: spacing.lg, minHeight: 190, padding: spacing.lg },
  paymentGlyph: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  paymentGlyphText: { color: colors.textMuted, fontSize: 14 },
  paymentContent: { gap: spacing.sm, marginTop: spacing.xl },
  paymentBar: {
    borderRadius: radius.full,
    flexDirection: 'row',
    height: 10,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  paymentSegment: { height: '100%' },
  paymentRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  paymentName: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  paymentDot: { borderRadius: radius.full, height: 8, width: 8 },
  paymentLabel: { color: colors.textMuted, fontSize: 11 },
  paymentPercentage: { color: colors.text, fontSize: 11, fontWeight: '600' },
  actions: { gap: spacing.sm },
  actionRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#F1EFEC',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  actionIcon: { color: colors.text, fontSize: 15, marginRight: spacing.sm },
  actionText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '500' },
  actionArrow: { color: colors.textMuted, fontSize: 20, marginLeft: spacing.sm },
});
