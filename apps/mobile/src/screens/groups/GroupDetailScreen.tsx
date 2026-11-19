import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ChevronRight, Plus, Share2 } from '../../components/icons';
import { showSnackbar } from '../../components/snackbar';
import {
  balanceLine,
  categoryEmoji,
  categoryLabel,
  describeActivity,
  displayDate,
  errorMessage,
  groupByDay,
  groupStats,
  memberName,
} from '../../features/groups/groupFormat';
import { getGroupsApi } from '../../features/groups/groupsApi';
import { downloadGroupSummary, shareGroupSummary } from '../../features/groups/groupSummaryPdf';
import { shareInvite } from '../../features/groups/inviteLink';
import type { ActivityItem, GroupDetail, GroupExpense, Settlement } from '../../features/groups/types';
import { usePrivacy } from '../../features/privacy/privacy';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { Avatar, Segmented } from './groupComponents';
import { groupStyles as s, toneColor } from './groupStyles';

type Tab = 'expenses' | 'balances' | 'activity';
const TABS = [
  { value: 'expenses', label: 'Expenses' },
  { value: 'balances', label: 'Balances' },
  { value: 'activity', label: 'Activity' },
] as const;

const hero = {
  background: '#4F12B3',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  glass: 'rgba(255,255,255,0.14)',
  get: '#7CF5C4',
  owe: '#FFB4B4',
};

function QuickAction({
  label,
  icon,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, primary && styles.actionPrimary, disabled && styles.disabled, pressed && s.pressed]}
    >
      <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>{icon}</View>
      <Text variant="label" style={[styles.actionLabel, primary && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function GroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { groupId, justCreated } = useRoute<RouteProp<RootStackParamList, 'GroupDetail'>>().params;
  const { mask } = usePrivacy();

  const [tab, setTab] = useState<Tab>('expenses');
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const api = getGroupsApi();
      const [detail, items, payments, log] = await Promise.all([
        api.detail(groupId),
        api.listExpenses(groupId),
        api.listSettlements(groupId),
        api.activity(groupId),
      ]);
      setGroup(detail);
      setExpenses(items);
      setSettlements(payments);
      setActivity(log);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (work: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await work();
      if (success) showSnackbar({ message: success, tone: 'success' });
      await load();
    } catch (reason) {
      showSnackbar({ message: errorMessage(reason), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!group) {
    return (
      <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <View style={s.headerWrap}>
          <AppHeader title="Group" showBack onBack={() => navigation.goBack()} />
        </View>
        <View style={s.content}>
          {error ? <Text style={s.error}>{error}</Text> : <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} />}
        </View>
      </Screen>
    );
  }

  const me = group.myMemberId;
  const mine = group.members.find(member => member.id === me);
  const myBalance = mine?.balancePaise ?? 0;
  const closed = group.status === 'CLOSED';
  const stats = groupStats(expenses, me);
  const people = group.members.filter(member => member.status !== 'REMOVED');
  const name = (id: string) => (id === me ? 'You' : memberName(group.members, id));
  const canChange = (createdBy: string) => group.myRole === 'ADMIN' || createdBy === me;

  const heroLabel = 0 < myBalance ? 'You get back' : myBalance < 0 ? 'You owe' : 'You are all settled';
  const heroAmount = myBalance === 0 ? '₹0' : formatRupees(Math.abs(myBalance));
  const heroColor = 0 < myBalance ? hero.get : myBalance < 0 ? hero.owe : hero.text;

  const openExpense = (expense: GroupExpense) => {
    if (!canChange(expense.createdByMemberId) || closed) {
      Alert.alert(expense.title, closed ? 'This group is complete.' : 'Only the person who added this, or a group admin, can change it.');
      return;
    }
    Alert.alert(expense.title, formatRupees(expense.amountPaise), [
      { text: 'Edit', onPress: () => navigation.navigate('AddGroupExpense', { groupId, expenseId: expense.id }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => run(() => getGroupsApi().deleteExpense(groupId, expense.id), 'Expense deleted'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // After completing, offer the summary PDF: save to Downloads, share, or skip.
  const offerPdf = () =>
    Alert.alert('Group complete', 'Do you want the summary PDF of this group?', [
      { text: 'Download PDF', onPress: () => run(() => downloadGroupSummary(groupId)) },
      { text: 'Share PDF', onPress: () => run(() => shareGroupSummary(groupId)) },
      { text: 'Not now', style: 'cancel' },
    ]);

  // Complete or reopen. Anyone can see the button; only admins can use it.
  const toggleComplete = () => {
    if (group.myRole !== 'ADMIN') {
      Alert.alert('Only an admin can do this', 'Ask a group admin to mark this group complete.');
      return;
    }
    const api = getGroupsApi();
    if (closed) {
      run(() => api.update(groupId, { status: 'ACTIVE' }), 'Group reopened');
      return;
    }
    const finish = async () => {
      setBusy(true);
      try {
        await api.update(groupId, { status: 'CLOSED' });
        showSnackbar({ message: 'Group marked complete', tone: 'success' });
        await load();
        offerPdf();
      } catch (reason) {
        showSnackbar({ message: errorMessage(reason), tone: 'error' });
      } finally {
        setBusy(false);
      }
    };
    if (group.transfers.length === 0) {
      finish();
      return;
    }
    Alert.alert(
      'Mark as complete?',
      'Some people have not settled up yet. A completed group is hidden from your dashboard.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark complete', onPress: finish },
      ],
    );
  };

  const settle = (fromMemberId: string, toMemberId: string, amountPaise: number) =>
    Alert.alert('Record payment', `${name(fromMemberId)} paid ${name(toMemberId)} ${formatRupees(amountPaise)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, paid',
        onPress: () =>
          run(() => getGroupsApi().createSettlement(groupId, { fromMemberId, toMemberId, amountPaise }), 'Payment recorded'),
      },
    ]);

  const removeSettlement = (settlement: Settlement) => {
    if (!canChange(settlement.createdByMemberId)) return;
    Alert.alert('Remove payment', 'This puts the balance back as it was.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => getGroupsApi().deleteSettlement(groupId, settlement.id)) },
    ]);
  };

  const myShare = (expense: GroupExpense) => {
    const paid = expense.payers.find(payer => payer.memberId === me)?.amountPaise ?? 0;
    const owed = expense.splits.find(split => split.memberId === me)?.amountPaise ?? 0;
    const net = paid - owed;
    if (net > 0) return { text: `you lent ${formatRupees(net)}`, color: colors.success };
    if (net < 0) return { text: `you borrowed ${formatRupees(-net)}`, color: colors.destructive };
    return { text: 'not involved', color: colors.textMuted };
  };

  return (
    <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={s.headerWrap}>
        <AppHeader
          title={group.title}
          subtitle={closed ? 'Completed' : `${people.length} people`}
          showBack
          onBack={() => navigation.goBack()}
          rightAction="Members"
          onRightAction={() => navigation.navigate('GroupMembers', { groupId })}
        />
      </View>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text variant="caption" style={{ color: hero.muted, fontSize: 13 }}>{heroLabel}</Text>
          <Text accessibilityLabel="Your balance" style={[styles.heroAmount, { color: heroColor }]}>{mask(heroAmount)}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text variant="caption" style={styles.heroStatLabel}>{'Total spent'}</Text>
              <Text variant="label" style={styles.heroStatValue}>{mask(formatRupees(stats.totalPaise))}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text variant="caption" style={styles.heroStatLabel}>{'You paid'}</Text>
              <Text variant="label" style={styles.heroStatValue}>{mask(formatRupees(stats.youPaidPaise))}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text variant="caption" style={styles.heroStatLabel}>{'Your share'}</Text>
              <Text variant="label" style={styles.heroStatValue}>{mask(formatRupees(stats.yourShare))}</Text>
            </View>
          </View>
        </View>

        <View style={s.row}>
          <QuickAction
            primary
            label="Add expense"
            disabled={closed || busy}
            icon={<Plus color={colors.primary} size={20} strokeWidth={2.5} />}
            onPress={() => navigation.navigate('AddGroupExpense', { groupId })}
          />
          <QuickAction
            label="Invite"
            icon={<Share2 color={colors.primary} size={20} />}
            onPress={() => shareInvite(group.title, group.inviteCode).catch(() => undefined)}
          />
        </View>

        {closed ? (
          <View style={styles.notice}>
            <Text variant="label" style={s.name}>{'This group is complete'}</Text>
            <Text variant="caption">{'It no longer shows on your dashboard. You can still view it or record payments.'}</Text>
          </View>
        ) : expenses.length > 0 && group.transfers.length === 0 ? (
          <View style={styles.notice}>
            <Text variant="label" style={s.name}>{'Everyone is settled up 🎉'}</Text>
            <Text variant="caption">{'Scroll down and tap Mark as complete to remove it from your dashboard.'}</Text>
          </View>
        ) : null}

        {justCreated ? (
          <View style={styles.notice}>
            <Text variant="label" style={s.name}>{'Invite your friends'}</Text>
            <Text variant="caption">{'Share the link on WhatsApp or anywhere. They tap it and join this group.'}</Text>
            <Button onPress={() => shareInvite(group.title, group.inviteCode)} accessibilityLabel="Share invite link">
              {'Share invite link'}
            </Button>
          </View>
        ) : null}

        <Segmented options={TABS} value={tab} onChange={setTab} />

        {error ? <Text style={s.error}>{error}</Text> : null}

        {tab === 'expenses' ? (
          expenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text variant="label" style={s.name}>{'No expenses yet'}</Text>
              <Text variant="caption" style={styles.emptyText}>{'Add the first expense and everyone sees their share.'}</Text>
            </View>
          ) : (
            groupByDay(expenses).map(day => (
              <View key={day.day} style={styles.dayBlock}>
                <Text variant="caption" style={styles.dayLabel}>{day.label}</Text>
                <View style={styles.list}>
                  {day.items.map((expense, index) => {
                    const share = myShare(expense);
                    const payerText = expense.payers.map(p => name(p.memberId)).join(', ');
                    return (
                      <Pressable
                        key={expense.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${expense.title}, ${formatRupees(expense.amountPaise)}`}
                        onPress={() => openExpense(expense)}
                        style={({ pressed }) => [styles.expenseRow, index > 0 && styles.divider, pressed && s.pressed]}
                      >
                        <View style={styles.emojiBadge}>
                          <Text style={styles.emoji}>{categoryEmoji(expense.categoryKey)}</Text>
                        </View>
                        <View style={s.flex}>
                          <Text variant="label" numberOfLines={1} style={s.name}>{expense.title}</Text>
                          <Text variant="caption" numberOfLines={1}>
                            {`${payerText} paid · ${categoryLabel(expense.categoryKey)}`}
                          </Text>
                        </View>
                        <View style={styles.amountCol}>
                          <Text variant="label" style={styles.amount}>{mask(formatRupees(expense.amountPaise))}</Text>
                          <Text variant="caption" style={{ color: share.color }}>
                            {share.text.includes('₹') ? mask(share.text) : share.text}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )
        ) : null}

        {tab === 'balances' ? (
          <>
            <Text variant="label" style={styles.sectionLabel}>{'Settle up'}</Text>
            {group.transfers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text variant="label" style={s.name}>{'Everyone is settled up'}</Text>
              </View>
            ) : (
              group.transfers.map(transfer => (
                <View key={`${transfer.fromMemberId}-${transfer.toMemberId}`} style={styles.transfer}>
                  <View style={styles.transferPeople}>
                    <Avatar name={memberName(group.members, transfer.fromMemberId)} size={36} />
                    <ChevronRight color={colors.textMuted} size={18} />
                    <Avatar name={memberName(group.members, transfer.toMemberId)} size={36} />
                  </View>
                  <View style={s.flex}>
                    <Text variant="label" style={s.name}>
                      {`${name(transfer.fromMemberId)} ${transfer.fromMemberId === me ? 'owe' : 'owes'} ${name(transfer.toMemberId)}`}
                    </Text>
                    <Text variant="label" style={styles.transferAmount}>{mask(formatRupees(transfer.amountPaise))}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mark as paid"
                    disabled={busy}
                    onPress={() => settle(transfer.fromMemberId, transfer.toMemberId, transfer.amountPaise)}
                    style={({ pressed }) => [styles.paidButton, pressed && s.pressed]}
                  >
                    <Text variant="label" style={styles.paidText}>{'Mark paid'}</Text>
                  </Pressable>
                </View>
              ))
            )}

            <Text variant="label" style={styles.sectionLabel}>{'Everyone'}</Text>
            <View style={styles.list}>
              {people.map((member, index) => {
                const line = balanceLine(member.balancePaise);
                return (
                  <View key={member.id} style={[styles.expenseRow, index > 0 && styles.divider]}>
                    <Avatar name={member.displayName} size={40} />
                    <View style={s.flex}>
                      <Text variant="label" numberOfLines={1} style={s.name}>
                        {member.id === me ? `${member.displayName} (you)` : member.displayName}
                      </Text>
                      {member.status === 'INVITED' ? <Text variant="caption">{'Not joined yet'}</Text> : null}
                    </View>
                    <Text variant="label" style={{ color: toneColor(line.tone) }}>
                      {line.tone === 'even' ? 'settled' : mask(line.text)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {settlements.length > 0 ? (
              <>
                <Text variant="label" style={styles.sectionLabel}>{'Payments made'}</Text>
                <View style={styles.list}>
                  {settlements.map((settlement, index) => (
                    <Pressable
                      key={settlement.id}
                      accessibilityRole="button"
                      accessibilityLabel="Payment"
                      onPress={() => removeSettlement(settlement)}
                      style={[styles.expenseRow, index > 0 && styles.divider]}
                    >
                      <View style={styles.emojiBadge}>
                        <Text style={styles.emoji}>💸</Text>
                      </View>
                      <View style={s.flex}>
                        <Text variant="label" numberOfLines={1} style={s.name}>
                          {`${name(settlement.fromMemberId)} paid ${name(settlement.toMemberId)}`}
                        </Text>
                        <Text variant="caption">{displayDate(settlement.settledAt)}</Text>
                      </View>
                      <Text variant="label">{mask(formatRupees(settlement.amountPaise))}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'activity' ? (
          activity.length === 0 ? (
            <Text variant="caption">{'Nothing has happened yet.'}</Text>
          ) : (
            <View style={styles.list}>
              {activity.map((item, index) => (
                <View key={item.id} style={[styles.activityRow, index > 0 && styles.divider]}>
                  <View style={styles.dot} />
                  <View style={s.flex}>
                    <Text style={styles.activityText}>{describeActivity(item)}</Text>
                    <Text variant="caption">{displayDate(item.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : null}

        <View style={styles.bottomActions}>
          {closed ? (
            <>
              <Button variant="secondary" disabled={busy} onPress={() => run(() => downloadGroupSummary(groupId))} accessibilityLabel="Download summary PDF">
                {'Download summary PDF'}
              </Button>
              <Button variant="secondary" disabled={busy} onPress={() => run(() => shareGroupSummary(groupId))} accessibilityLabel="Share summary PDF">
                {'Share summary PDF'}
              </Button>
              <Button variant="secondary" disabled={busy} onPress={toggleComplete} accessibilityLabel="Reopen group">
                {'Reopen group'}
              </Button>
            </>
          ) : (
            <Button disabled={busy} onPress={toggleComplete} accessibilityLabel="Mark group as complete">
              {'Mark as complete'}
            </Button>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: hero.background, borderRadius: radius.xl + 4, gap: spacing.xs, padding: spacing.xl },
  heroAmount: { fontSize: 38, fontWeight: '800', lineHeight: 46 },
  heroStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroStat: { backgroundColor: hero.glass, borderRadius: radius.md, flex: 1, gap: 2, padding: spacing.md },
  heroStatLabel: { color: hero.muted },
  heroStatValue: { color: hero.text, fontSize: 14 },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
  },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionIcon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40 },
  actionIconPrimary: { backgroundColor: colors.white },
  actionLabel: { color: colors.text, fontSize: 12 },
  disabled: { opacity: 0.45 },
  notice: { backgroundColor: colors.selected, borderColor: colors.primaryMuted, borderRadius: radius.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  sectionLabel: { color: colors.text, fontSize: 15, marginTop: spacing.xs },
  dayBlock: { gap: spacing.sm },
  dayLabel: { fontWeight: '600', letterSpacing: 0.3, marginLeft: spacing.xs },
  list: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  expenseRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.md + 2 },
  divider: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  emojiBadge: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  emoji: { fontSize: 22 },
  amountCol: { alignItems: 'flex-end', gap: 2 },
  amount: { color: colors.text, fontSize: 15 },
  transfer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md + 2,
  },
  transferPeople: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  transferAmount: { color: colors.text, fontSize: 17 },
  paidButton: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  paidText: { color: colors.white },
  bottomActions: { gap: spacing.sm, marginTop: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxxl },
  emptyEmoji: { fontSize: 40 },
  emptyText: { textAlign: 'center' },
  activityRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md + 2 },
  dot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, marginTop: 6, width: 8 },
  activityText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
