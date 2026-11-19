import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ChevronRight, Users } from '../../components/icons';
import { myBalanceLine } from '../../features/groups/groupFormat';
import { useGroupsOverview } from '../../features/groups/useGroupsOverview';
import { usePrivacy } from '../../features/privacy/privacy';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { formatRupees } from '../../utils/money';
import { groupStyles as s, toneColor } from './groupStyles';

export function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { overview, loading, error } = useGroupsOverview();
  const { mask } = usePrivacy();
  const all = overview?.items ?? [];
  const items = all.filter(item => item.status === 'ACTIVE');
  const completed = all.filter(item => item.status === 'CLOSED');
  const summary = overview?.summary;

  const renderRow = (item: (typeof all)[number]) => {
    const line = myBalanceLine(item.myBalancePaise);
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={`Open group ${item.title}`}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
        style={({ pressed }) => [s.card, s.row, pressed && s.pressed]}
      >
        <View style={s.avatar}>
          <Users color={colors.primary} size={18} />
        </View>
        <View style={s.flex}>
          <Text variant="label" numberOfLines={1} style={s.name}>{item.title}</Text>
          <Text variant="caption">
            {`${item.memberCount} people${item.status === 'CLOSED' ? ' · Completed' : ''}`}
          </Text>
        </View>
        <Text variant="label" style={{ color: toneColor(line.tone) }}>
          {line.tone === 'even' ? line.text : mask(line.text)}
        </Text>
        <ChevronRight color={colors.textMuted} size={18} />
      </Pressable>
    );
  };

  return (
    <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={s.headerWrap}>
        <AppHeader title="Splitwise" showBack onBack={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {summary && summary.groupCount > 0 ? (
          <View style={[s.card, s.row]}>
            <View style={s.flex}>
              <Text variant="caption">{'You get'}</Text>
              <Text variant="heading" style={{ color: colors.success }}>{mask(formatRupees(summary.youGetPaise))}</Text>
            </View>
            <View style={s.flex}>
              <Text variant="caption">{'You owe'}</Text>
              <Text variant="heading" style={{ color: colors.destructive }}>{mask(formatRupees(summary.youOwePaise))}</Text>
            </View>
          </View>
        ) : null}

        {error ? <Text style={s.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} /> : null}

        {!loading && all.length === 0 && !error ? (
          <View style={[s.card, { alignItems: 'center' }]}>
            <Users color={colors.primary} size={32} />
            <Text variant="label" style={s.name}>{'No groups yet'}</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {'Going on a trip or sharing a flat? Make a group, add expenses, and see who owes whom.'}
            </Text>
          </View>
        ) : null}

        {items.map(renderRow)}
        {completed.length > 0 ? (
          <>
            <Text variant="label" style={s.sectionTitle}>{'Completed'}</Text>
            {completed.map(renderRow)}
          </>
        ) : null}
        <Button onPress={() => navigation.navigate('CreateGroup')} accessibilityLabel="Create a new group">
          {'New group'}
        </Button>
        <Button variant="secondary" onPress={() => navigation.navigate('JoinGroup', {})} accessibilityLabel="Join with a code">
          {'Join with link or code'}
        </Button>
      </ScrollView>
    </Screen>
  );
}
