import React, { useLayoutEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { bottomSafeAreaInset, FIXED_ACTION_SCROLL_GAP } from '../../components/layoutInsets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';
import {
  recurringExpenseData,
  recurringIncomeData,
  type RecurringItem,
} from './recurringData';

function RecurringItemRow({
  item,
}: {
  item: RecurringItem;
}) {
  return (
    <Card style={styles.itemCard}>
      <View style={[styles.itemIcon, { backgroundColor: item.iconBackground }]}>
        <Text style={[styles.itemGlyph, { color: item.iconColor }]}>{item.icon}</Text>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
          <View style={styles.statusBadge}><Text style={styles.statusText}>{item.status}</Text></View>
        </View>
        <Text style={styles.frequency}>{item.frequency}</Text>
        <Text style={styles.nextDate}>◷ {item.nextOccurrence}</Text>
      </View>
      <View style={styles.amountBlock}>
        <Text style={styles.itemAmount}>{item.amount}</Text>
        <Text style={styles.scheduled}>{item.trailingLabel}</Text>
      </View>
    </Card>
  );
}

export function RecurringScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<'Expenses' | 'Income'>('Expenses');
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const scrollOffset = useRef({Expenses: 0, Income: 0});
  const selectedData = selectedTab === 'Expenses' ? recurringExpenseData : recurringIncomeData;

  useLayoutEffect(() => {
    scrollViewRef.current?.scrollTo({y: scrollOffset.current[selectedTab], animated: false});
  }, [selectedTab]);

  const selectTab = (tab: 'Expenses' | 'Income') => {
    if (tab === selectedTab) {
      return;
    }

    setSelectedTab(tab);
  };

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Recurring</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="More recurring options" style={styles.moreButton}>
            <Text style={styles.moreGlyph}>⋮</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
            <Text style={styles.profileGlyph}>♙</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: FIXED_ACTION_SCROLL_GAP },
        ]}
        onScroll={event => {
          scrollOffset.current[selectedTab] = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabs}>
          {(['Expenses', 'Income'] as const).map(tab => {
            const selected = selectedTab === tab;
            return (
              <Pressable key={tab} accessibilityRole="button" accessibilityLabel={tab} accessibilityState={{ selected }} onPress={() => selectTab(tab)} style={[styles.tab, selected && styles.selectedTab]}>
                <Text style={[styles.tabText, selected && styles.selectedTabText]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.upcomingLabel}><View style={styles.purpleDot} /><Text style={styles.upcomingText}>{selectedData.summary.upcomingLabel}</Text></View>
            <View style={styles.countBadge}><Text style={styles.countText}>{selectedData.summary.activeCount}</Text></View>
          </View>
          <View style={styles.totalLine}><Text style={styles.totalAmount}>{selectedData.summary.amount}</Text><Text style={styles.totalPeriod}>{selectedData.summary.period}</Text></View>
          <Text style={styles.renewal}>▣ {selectedData.summary.renewal}</Text>
          <View style={styles.featuredPayment}>
            <View style={styles.featuredIcon}><Text style={styles.bellGlyph}>♧</Text></View>
            <View style={styles.featuredDetails}><Text style={styles.featuredTitle}>{selectedData.summary.featuredName} · {selectedData.summary.featuredDetail}</Text><Text style={styles.featuredDate}>{selectedData.summary.featuredDate}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.summaryDescription}>{selectedData.summary.description}</Text>
          <View pointerEvents="none" style={styles.summaryOrb} />
        </Card>

        <View style={styles.overviewBanner}>
          <View style={styles.overviewIcon}><Text style={styles.calendarGlyph}>▦</Text></View>
          <View style={styles.overviewCopy}><Text style={styles.overviewTitle}>{selectedData.overviewTitle}</Text><Text style={styles.overviewDescription}>{selectedData.overviewDescription}</Text></View>
        </View>

        {selectedData.groups.map(group => (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHeading}><Text style={styles.groupTitle}>{group.title}</Text><Text style={styles.groupSummary}>{group.summary}</Text></View>
            {group.items.map(item => <RecurringItemRow key={item.id} item={item} />)}
          </View>
        ))}

        <View style={styles.reminderCard}>
          <View style={styles.reminderIcon}><Text style={styles.shieldGlyph}>♢</Text></View>
          <View style={styles.reminderCopy}><Text style={styles.reminderTitle}>{selectedData.reminderTitle}</Text><Text style={styles.reminderDescription}>{selectedData.reminderDescription}</Text></View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.md }]}>
        <Pressable accessibilityRole="button" style={styles.primaryAction}><Text style={styles.primaryPlus}>＋</Text><Text style={styles.primaryActionText}>Add recurring expense</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.secondaryAction}><Text style={styles.secondaryPlus}>＋</Text><Text style={styles.secondaryActionText}>Add recurring income</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingBottom: 0, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', height: 56, marginBottom: spacing.lg },
  backButton: { height: 44, justifyContent: 'center', width: 40 },
  backGlyph: { color: '#111111', fontSize: 44, lineHeight: 46, marginTop: -5 },
  headerTitle: { color: '#111111', flex: 1, fontSize: typography.xl, fontWeight: '600' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  moreButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 24 },
  moreGlyph: { color: '#393641', fontSize: 28, lineHeight: 30 },
  profileButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 3, height: 44, justifyContent: 'center', width: 44 },
  profileGlyph: { color: colors.white, fontSize: 22 },
  scrollView: { flex: 1 },
  content: { gap: spacing.lg },
  tabs: { backgroundColor: '#F0EFEB', borderRadius: radius.full, flexDirection: 'row', height: 58, marginBottom: spacing.md, padding: 5 },
  tab: { alignItems: 'center', borderRadius: radius.full, flex: 1, justifyContent: 'center' },
  selectedTab: { backgroundColor: '#7839E8' },
  tabText: { color: '#393641', fontSize: typography.md, fontWeight: '500' },
  selectedTabText: { color: colors.white, fontWeight: '600' },
  summaryCard: { borderColor: '#F0EFEB', borderRadius: radius.xl, minHeight: 344, overflow: 'hidden', padding: spacing.xl, position: 'relative' },
  summaryHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  upcomingLabel: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  purpleDot: { backgroundColor: colors.primary, borderRadius: radius.full, height: 11, width: 11 },
  upcomingText: { color: '#393641', fontSize: typography.sm, letterSpacing: 0.5 },
  countBadge: { backgroundColor: '#F0EFEB', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  countText: { color: '#393641', fontSize: typography.sm },
  totalLine: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  totalAmount: { color: '#111111', fontSize: 34, fontWeight: '700', letterSpacing: -1, lineHeight: 40 },
  totalPeriod: { color: '#393641', fontSize: typography.md },
  renewal: { color: '#393641', fontSize: typography.md, marginTop: spacing.xs },
  featuredPayment: { alignItems: 'center', backgroundColor: '#F3F3EF', borderRadius: radius.md, flexDirection: 'row', marginTop: spacing.lg, minHeight: 64, paddingHorizontal: spacing.md },
  featuredIcon: { alignItems: 'center', backgroundColor: '#FFE0BE', borderRadius: radius.full, height: 46, justifyContent: 'center', marginRight: spacing.md, width: 46 },
  bellGlyph: { color: '#7C4100', fontSize: 21 },
  featuredDetails: { flex: 1 },
  featuredTitle: { color: '#16141A', fontSize: typography.md },
  featuredDate: { color: '#393641', fontSize: typography.sm, marginTop: 2 },
  chevron: { color: '#716D79', fontSize: 30, marginLeft: spacing.sm },
  summaryDescription: { color: '#4F4A55', fontSize: typography.md, lineHeight: 23, marginTop: spacing.xl, paddingRight: spacing.xs, zIndex: 1 },
  summaryOrb: { backgroundColor: '#F7F3FC', borderRadius: 100, height: 170, position: 'absolute', right: -24, top: 256, width: 170 },
  overviewBanner: { alignItems: 'center', backgroundColor: '#F3F3EF', borderRadius: radius.xl, flexDirection: 'row', minHeight: 112, padding: spacing.lg },
  overviewIcon: { alignItems: 'center', backgroundColor: '#EEEFEC', borderRadius: radius.md, height: 48, justifyContent: 'center', marginRight: spacing.md, width: 48 },
  calendarGlyph: { color: colors.primary, fontSize: 25 },
  overviewCopy: { flex: 1 },
  overviewTitle: { color: '#111111', fontSize: typography.lg, fontWeight: '600', lineHeight: 24 },
  overviewDescription: { color: '#393641', fontSize: typography.md, lineHeight: 22, marginTop: 2 },
  group: { gap: spacing.md, marginTop: spacing.xs },
  groupHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.xs },
  groupTitle: { color: '#111111', fontSize: typography.lg, fontWeight: '600' },
  groupSummary: { color: '#393641', fontSize: typography.sm },
  itemCard: { alignItems: 'center', borderColor: '#F0EFEB', borderRadius: radius.xl, flexDirection: 'row', minHeight: 112, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  itemIcon: { alignItems: 'center', borderRadius: radius.md, height: 52, justifyContent: 'center', marginRight: spacing.md, width: 52 },
  itemGlyph: { fontSize: 27, fontWeight: '600' },
  itemDetails: { flex: 1, minWidth: 0 },
  nameLine: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  itemName: { color: '#111111', flexShrink: 1, fontSize: 20, fontWeight: '600' },
  statusBadge: { backgroundColor: '#5EEFC0', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 3 },
  statusText: { color: '#004B36', fontSize: typography.sm },
  frequency: { color: '#4F4A55', fontSize: typography.md, marginTop: 2 },
  nextDate: { color: '#805100', fontSize: typography.sm, marginTop: spacing.xs },
  amountBlock: { alignItems: 'flex-end', marginLeft: spacing.sm },
  itemAmount: { color: '#111111', fontSize: typography.lg, fontWeight: '700' },
  scheduled: { color: '#393641', fontSize: typography.sm },
  reminderCard: { alignItems: 'flex-start', backgroundColor: '#F3F3EF', borderRadius: radius.xl, flexDirection: 'row', marginTop: spacing.sm, padding: spacing.lg },
  reminderIcon: { alignItems: 'center', backgroundColor: '#ECDDFC', borderRadius: radius.full, height: 42, justifyContent: 'center', marginRight: spacing.md, width: 42 },
  shieldGlyph: { color: '#2C1262', fontSize: 24 },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: '#111111', fontSize: typography.md, fontWeight: '600' },
  reminderDescription: { color: '#4F4A55', fontSize: typography.md, lineHeight: 23, marginTop: spacing.xs },
  actions: { backgroundColor: colors.background, flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
  primaryAction: { alignItems: 'center', backgroundColor: '#7839E8', borderColor: '#5F20C8', borderRadius: radius.full, borderWidth: 1, elevation: 3, flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 62, paddingHorizontal: spacing.md },
  primaryPlus: { color: colors.white, fontSize: 22, marginRight: spacing.sm },
  primaryActionText: { color: colors.white, flexShrink: 1, fontSize: typography.sm, fontWeight: '600', textAlign: 'center' },
  secondaryAction: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, elevation: 3, flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 62, paddingHorizontal: spacing.md },
  secondaryPlus: { color: colors.primary, fontSize: 22, marginRight: spacing.sm },
  secondaryActionText: { color: colors.primary, flexShrink: 1, fontSize: typography.sm, fontWeight: '600', textAlign: 'center' },
});
