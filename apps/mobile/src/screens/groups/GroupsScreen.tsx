import React, {useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {Text} from '../../components/Text';
import {kharchivaIcon} from '../../assets';
import {bottomSafeAreaInset, FIXED_ACTION_SCROLL_GAP} from '../../components/layoutInsets';
import type {RootStackParamList} from '../../navigation/types';
import {colors, radius, spacing, typography} from '../../theme';
import {groupOverview, sharedActivities, sharedGroups, type SharedActivity, type SharedGroup} from './groupsData';

function GroupCard({group, onOpen}: {group: SharedGroup; onOpen: () => void}) {
  const owes = group.balanceTone === 'owe';
  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupTop}>
        <View style={[styles.groupImage, group.imageTone === 'sand' ? styles.sandImage : styles.homeImage]}><Text style={styles.groupImageGlyph}>{group.imageGlyph}</Text></View>
        <View style={styles.groupTitleBlock}>
          <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMeta}>{group.memberCount} members · Total shared {group.totalShared}</Text>
        </View>
        <View style={[styles.balanceBadge, owes ? styles.oweBadge : styles.owedBadge]}><Text style={[styles.balanceBadgeText, owes ? styles.oweText : styles.owedText]}>{group.balanceLabel}</Text></View>
      </View>

      <View style={styles.latestActivity}>
        <View style={styles.avatarStack}>
          {group.members.map((member, index) => <View key={`${group.id}-${member.initials}`} style={[styles.avatar, styles[`avatar${member.tone}`], index > 0 && styles.avatarOverlap]}><Text style={styles.avatarText}>{member.initials}</Text></View>)}
        </View>
        <View style={styles.latestCopy}><Text style={styles.latestLabel}>Last activity</Text><Text numberOfLines={1} style={styles.latestText}>{group.activity} · {group.activityDetail}</Text></View>
      </View>

      <View style={styles.groupFooter}>
        <View style={styles.groupStatus}>{group.splitCount ? <Text style={styles.ledgerIcon}>▤</Text> : <Text style={styles.syncedIcon}>✓</Text>}<Text style={styles.groupStatusText}>{group.splitCount ?? group.syncStatus}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${group.name} split ledger`} onPress={onOpen} style={styles.ledgerLink}><Text style={styles.ledgerLinkText}>View Split Ledger</Text><Text style={styles.arrow}>→</Text></Pressable>
      </View>
    </Card>
  );
}

function ActivityRow({activity, last}: {activity: SharedActivity; last: boolean}) {
  return (
    <View style={[styles.activityRow, last && styles.activityLast]}>
      <View style={[styles.activityIcon, styles[`activity${activity.tone}`]]}><Text style={styles.activityGlyph}>{activity.icon}</Text></View>
      <View style={styles.activityCopy}><Text numberOfLines={1} style={styles.activityTitle}>{activity.title}</Text><Text numberOfLines={1} style={styles.activityMeta}>{activity.group} · {activity.paidBy}</Text></View>
      <View style={styles.activityAmountBlock}><Text style={[styles.activityAmount, activity.amountTone === 'green' && styles.activityAmountGreen]}>{activity.amount}</Text><Text numberOfLines={1} style={styles.activityShare}>{activity.share}</Text></View>
    </View>
  );
}

export function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [actionFeedback, setActionFeedback] = useState('');

  const onGroupLedger = (group: SharedGroup) => {
    setActionFeedback(`${group.name} split ledger opened`);
  };

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, {paddingTop: Math.max(insets.top, spacing.sm)}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backGlyph}>‹</Text></Pressable>
        <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandMark} />
        <Text numberOfLines={1} style={styles.headerTitle}>Kharchiva — Groups &amp; Shared Expenses</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}><Text style={styles.profileGlyph}>♙</Text></Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, {paddingBottom: FIXED_ACTION_SCROLL_GAP}]} showsVerticalScrollIndicator={false}>
        <View style={styles.hubHeader}>
          <View style={styles.hubLabel}><View style={styles.hubDot}/><Text style={styles.hubText}>SHARED HUB</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="New Group" onPress={() => setActionFeedback('New group preview ready')} style={styles.newGroupButton}><Text style={styles.newGroupGlyph}>♧</Text><Text style={styles.newGroupText}>New Group</Text></Pressable>
        </View>

        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeading}>
            <View><Text style={styles.overviewLabel}>OVERALL GROUP STANDING</Text><View style={styles.netLine}><Text style={styles.netAmount}>{groupOverview.netAmount}</Text><View style={styles.netBadge}><Text style={styles.netBadgeText}>{groupOverview.netLabel}</Text></View></View></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Settle balances" onPress={() => setActionFeedback('Settlement summary ready')} style={styles.settlementIcon}><Text style={styles.settlementGlyph}>↔</Text></Pressable>
          </View>
          <View style={styles.balances}>
            <View style={styles.balanceCard}><View style={styles.balanceGroup}><View style={styles.oweDot}/><Text numberOfLines={1} style={styles.balanceGroupText}>{groupOverview.oweGroup}</Text></View><Text style={styles.amountOwe}>{groupOverview.oweAmount}</Text><Text style={styles.balanceCaption}>You owe</Text></View>
            <View style={styles.balanceCard}><View style={styles.balanceGroup}><View style={styles.owedDot}/><Text numberOfLines={1} style={styles.balanceGroupTextOwed}>{groupOverview.owedGroup}</Text></View><Text style={styles.amountOwed}>{groupOverview.owedAmount}</Text><Text style={styles.balanceCaption}>You are owed</Text></View>
          </View>
          <View style={styles.settlementActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Settle Balances" onPress={() => setActionFeedback('Settlement summary ready')} style={styles.settleButton}><Text style={styles.settleText}>Settle Balances</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Export group summary" onPress={() => setActionFeedback('Group summary saved locally')} style={styles.exportButton}><Text style={styles.exportGlyph}>⇩</Text></Pressable>
          </View>
        </Card>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Active Groups</Text><Text style={styles.sectionAside}>{groupOverview.groupCount}</Text></View>
        {sharedGroups.map(group => <GroupCard key={group.id} group={group} onOpen={() => onGroupLedger(group)} />)}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent Activity</Text><Text style={styles.sectionAside}>Across groups</Text></View>
        <Card style={styles.activityCard}>
          {sharedActivities.map((activity, index) => <ActivityRow key={activity.id} activity={activity} last={index === sharedActivities.length - 1}/>) }
        </Card>

        <View style={styles.inviteCard}>
          <View style={styles.inviteIcon}><Text style={styles.inviteGlyph}>☷</Text></View>
          <View style={styles.inviteCopy}><Text style={styles.inviteTitle}>Invited by someone?</Text><Text numberOfLines={1} style={styles.inviteDetail}>Enter 6-digit code or tap group invite link</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Join Group" onPress={() => setActionFeedback('Group invite entry ready')} style={styles.joinButton}><Text style={styles.joinText}>Join Group</Text></Pressable>
        </View>
        {actionFeedback ? <Text accessibilityLiveRegion="polite" style={styles.actionFeedback}>{actionFeedback}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.sm}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add Shared Expense" onPress={() => navigation.navigate('SplitExpense')} style={styles.addExpenseButton}><Text style={styles.addGlyph}>＋</Text><Text style={styles.addExpenseText}>Add Shared Expense</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0},
  header: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingBottom: spacing.xs, paddingHorizontal: spacing.md},
  backButton: {alignItems: 'center', height: 38, justifyContent: 'center', width: 28},
  backGlyph: {color: colors.text, fontSize: 35, lineHeight: 40, marginTop: -4},
  brandMark: {height: 30, width: 30},
  headerTitle: {color: '#111111', flex: 1, fontSize: typography.lg, fontWeight: '500'},
  profileButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 3, height: 36, justifyContent: 'center', width: 36},
  profileGlyph: {color: colors.white, fontSize: 19},
  scrollView: {flex: 1},
  content: {gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  hubHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md},
  hubLabel: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm},
  hubDot: {backgroundColor: '#7839E8', borderRadius: radius.full, height: 11, width: 11},
  hubText: {color: '#393641', fontSize: typography.sm, letterSpacing: 0.5},
  newGroupButton: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, minHeight: 38, paddingHorizontal: spacing.md},
  newGroupGlyph: {color: colors.primary, fontSize: 17},
  newGroupText: {color: colors.text, fontSize: typography.sm},
  overviewCard: {borderColor: '#F0EFEB', borderRadius: radius.xl, gap: spacing.lg, padding: spacing.lg},
  overviewHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  overviewLabel: {color: '#393641', fontSize: typography.sm, letterSpacing: 0.4},
  netLine: {alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs},
  netAmount: {color: '#111111', fontSize: 34, fontWeight: '700', letterSpacing: -1, lineHeight: 40},
  netBadge: {backgroundColor: '#F0EFEB', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs},
  netBadgeText: {color: '#393641', fontSize: typography.sm},
  settlementIcon: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.full, height: 44, justifyContent: 'center', width: 44},
  settlementGlyph: {color: colors.primary, fontSize: 24},
  balances: {flexDirection: 'row', gap: spacing.md},
  balanceCard: {backgroundColor: '#F3F2EE', borderRadius: radius.lg, flex: 1, gap: spacing.xs, minHeight: 86, padding: spacing.md},
  balanceGroup: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs},
  oweDot: {backgroundColor: '#805000', borderRadius: radius.full, height: 8, width: 8},
  owedDot: {backgroundColor: colors.success, borderRadius: radius.full, height: 8, width: 8},
  balanceGroupText: {color: '#393641', flex: 1, fontSize: typography.xs},
  balanceGroupTextOwed: {color: colors.success, flex: 1, fontSize: typography.xs},
  amountOwe: {color: '#111111', fontSize: typography.md, fontWeight: '500'},
  amountOwed: {color: colors.success, fontSize: typography.md, fontWeight: '500'},
  balanceCaption: {color: '#393641', fontSize: typography.xs},
  settlementActions: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  settleButton: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.full, flex: 1, justifyContent: 'center', minHeight: 52},
  settleText: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  exportButton: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.full, height: 52, justifyContent: 'center', width: 52},
  exportGlyph: {color: colors.text, fontSize: 21},
  sectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.xs, marginTop: spacing.md},
  sectionTitle: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  sectionAside: {color: '#393641', fontSize: typography.xs},
  groupCard: {borderColor: '#F0EFEB', borderRadius: radius.xl, gap: spacing.md, padding: spacing.lg},
  groupTop: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  groupImage: {alignItems: 'center', borderRadius: radius.md, height: 50, justifyContent: 'center', overflow: 'hidden', width: 50},
  sandImage: {backgroundColor: '#E8D9BC'},
  homeImage: {backgroundColor: '#E5E0D7'},
  groupImageGlyph: {fontSize: 25},
  groupTitleBlock: {flex: 1, minWidth: 0},
  groupName: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  groupMeta: {color: colors.textMuted, fontSize: typography.sm, marginTop: 2},
  balanceBadge: {borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs},
  oweBadge: {backgroundColor: '#FFE0BE'},
  owedBadge: {backgroundColor: '#61EFC0'},
  balanceBadgeText: {fontSize: typography.xs},
  oweText: {color: '#754000'},
  owedText: {color: colors.success},
  latestActivity: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.lg, flexDirection: 'row', minHeight: 60, paddingHorizontal: spacing.md},
  avatarStack: {alignItems: 'center', flexDirection: 'row', marginRight: spacing.sm},
  avatar: {alignItems: 'center', borderColor: '#F3F2EE', borderRadius: radius.full, borderWidth: 2, height: 38, justifyContent: 'center', width: 38},
  avatarOverlap: {marginLeft: -12},
  avatarviolet: {backgroundColor: '#EADDFC'},
  avatargreen: {backgroundColor: '#61EFC0'},
  avataramber: {backgroundColor: '#FFE0BE'},
  avatargray: {backgroundColor: '#E4E2DE'},
  avatarText: {color: '#393641', fontSize: typography.sm, fontWeight: '500'},
  latestCopy: {flex: 1, minWidth: 0},
  latestLabel: {color: '#393641', fontSize: typography.xs, textAlign: 'right'},
  latestText: {color: '#393641', fontSize: typography.sm, textAlign: 'right'},
  groupFooter: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  groupStatus: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, maxWidth: '48%'},
  ledgerIcon: {color: colors.primary, fontSize: typography.md},
  syncedIcon: {color: colors.success, fontSize: typography.md},
  groupStatusText: {color: '#393641', fontSize: typography.xs},
  ledgerLink: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs},
  ledgerLinkText: {color: colors.primary, fontSize: typography.sm},
  arrow: {color: colors.primary, fontSize: typography.lg},
  activityCard: {borderColor: '#F0EFEB', borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs},
  activityRow: {alignItems: 'center', borderBottomColor: '#E8E5E0', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 74, paddingVertical: spacing.sm},
  activityLast: {borderBottomWidth: 0},
  activityIcon: {alignItems: 'center', borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44},
  activityamber: {backgroundColor: '#F3F2EE'},
  activitygreen: {backgroundColor: '#61EFC0'},
  activityviolet: {backgroundColor: '#F3F2EE'},
  activityGlyph: {color: '#754000', fontSize: 21},
  activityCopy: {flex: 1, gap: 2, minWidth: 0},
  activityTitle: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  activityMeta: {color: colors.textMuted, fontSize: typography.xs},
  activityAmountBlock: {alignItems: 'flex-end', maxWidth: '37%'},
  activityAmount: {color: '#111111', fontSize: typography.md, fontWeight: '500'},
  activityAmountGreen: {color: colors.success},
  activityShare: {color: colors.textMuted, fontSize: typography.xs},
  inviteCard: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, padding: spacing.lg},
  inviteIcon: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40},
  inviteGlyph: {color: colors.primary, fontSize: 19},
  inviteCopy: {flex: 1, minWidth: 0},
  inviteTitle: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  inviteDetail: {color: colors.textMuted, fontSize: typography.xs},
  joinButton: {alignItems: 'center', backgroundColor: '#E4E2DE', borderRadius: radius.full, justifyContent: 'center', minHeight: 38, paddingHorizontal: spacing.md},
  joinText: {color: '#111111', fontSize: typography.sm},
  actionFeedback: {color: colors.success, fontSize: typography.sm, paddingHorizontal: spacing.sm},
  footer: {backgroundColor: colors.background, paddingHorizontal: spacing.xxl, paddingTop: spacing.sm},
  addExpenseButton: {alignItems: 'center', backgroundColor: '#7839E8', borderRadius: radius.full, elevation: 5, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 60, paddingHorizontal: spacing.xl, shadowColor: colors.primary, shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.22, shadowRadius: 12},
  addGlyph: {color: colors.white, fontSize: 26, lineHeight: 28},
  addExpenseText: {color: colors.white, fontSize: typography.lg, fontWeight: '600'},
});
