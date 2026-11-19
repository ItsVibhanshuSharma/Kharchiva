import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { showSnackbar } from '../../components/snackbar';
import { balanceLine, errorMessage } from '../../features/groups/groupFormat';
import { getGroupsApi, normalizePhone } from '../../features/groups/groupsApi';
import { buildInviteLink, shareInvite } from '../../features/groups/inviteLink';
import type { GroupDetail, GroupMember } from '../../features/groups/types';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { initialsOf } from '../profile/profileData';
import { groupStyles as s, toneColor } from './groupStyles';

export function GroupMembersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { groupId } = useRoute<RouteProp<RootStackParamList, 'GroupMembers'>>().params;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getGroupsApi()
        .detail(groupId)
        .then(detail => {
          setGroup(detail);
          setLoadError('');
        })
        .catch(reason => setLoadError(errorMessage(reason)));
    }, [groupId]),
  );

  const run = async (work: () => Promise<GroupDetail | null | void>, success?: string) => {
    setBusy(true);
    try {
      const result = await work();
      if (success) showSnackbar({ message: success, tone: 'success' });
      if (result) setGroup(result);
      return result;
    } catch (reason) {
      showSnackbar({ message: errorMessage(reason), tone: 'error' });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  if (!group) {
    return (
      <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <View style={s.headerWrap}>
          <AppHeader title="Members" showBack onBack={() => navigation.goBack()} />
        </View>
        <View style={s.content}>
          {loadError ? <Text style={s.error}>{loadError}</Text> : <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} />}
        </View>
      </Screen>
    );
  }

  const api = getGroupsApi();
  const isAdmin = group.myRole === 'ADMIN';
  const closed = group.status === 'CLOSED';
  const visible = group.members.filter(member => member.status !== 'REMOVED');

  const add = async () => {
    const phoneNumber = normalizePhone(phone);
    if (!name.trim() || !phoneNumber) return setFormError('Enter a name and a valid 10-digit mobile number.');
    setFormError('');
    const result = await run(() => api.addMember(groupId, { displayName: name, phoneNumber }), 'Person added');
    if (result) {
      setName('');
      setPhone('');
    }
  };

  const openMember = (member: GroupMember) => {
    const isMe = member.id === group.myMemberId;
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
    if (isAdmin && !isMe && member.status !== 'INVITED') {
      buttons.push({
        text: member.role === 'ADMIN' ? 'Make member' : 'Make admin',
        onPress: () => run(() => api.setRole(groupId, member.id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')),
      });
    }
    if (isAdmin && !isMe) {
      buttons.push({ text: 'Remove from group', style: 'destructive', onPress: () => run(() => api.removeMember(groupId, member.id), 'Person removed') });
    }
    if (isMe) {
      buttons.push({
        text: 'Leave group',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.removeMember(groupId, member.id);
            navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Groups' }] });
          } catch (reason) {
            showSnackbar({ message: errorMessage(reason), tone: 'error' });
            setBusy(false);
          }
        },
      });
    }
    if (buttons.length === 0) return;
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(member.displayName, member.phoneNumber ?? undefined, buttons);
  };

  const unsettled = group.members.some(member => member.balancePaise !== 0);
  const complete = () => run(() => api.update(groupId, { status: 'CLOSED' }), 'Group marked complete');
  const toggleComplete = () => {
    if (closed) return run(() => api.update(groupId, { status: 'ACTIVE' }), 'Group reopened');
    if (!unsettled) return complete();
    Alert.alert(
      'Mark as complete?',
      'Some people have not settled up yet. A completed group is hidden from your dashboard.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark complete', onPress: complete },
      ],
    );
  };

  const confirmDelete = () =>
    Alert.alert('Delete group', 'The group and its expenses are removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.remove(groupId);
            navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Groups' }] });
          } catch (reason) {
            showSnackbar({ message: errorMessage(reason), tone: 'error' });
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={s.headerWrap}>
        <AppHeader title="Members" subtitle={group.title} showBack onBack={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text variant="label" style={s.name}>{'Invite link'}</Text>
          <Text variant="caption" selectable>{buildInviteLink(group.inviteCode)}</Text>
          <Text variant="caption" selectable>{`Code: ${group.inviteCode}`}</Text>
          <Button onPress={() => shareInvite(group.title, group.inviteCode).catch(() => undefined)} accessibilityLabel="Share invite link">
            {'Share invite link'}
          </Button>
        </View>

        {visible.map(member => {
          const line = balanceLine(member.balancePaise);
          const isMe = member.id === group.myMemberId;
          return (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`${member.displayName} options`}
              onPress={() => openMember(member)}
              style={({ pressed }) => [s.card, s.row, pressed && s.pressed]}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initialsOf(member.displayName)}</Text>
              </View>
              <View style={s.flex}>
                <Text variant="label" numberOfLines={1} style={s.name}>{isMe ? `${member.displayName} (you)` : member.displayName}</Text>
                <Text variant="caption">
                  {[member.role === 'ADMIN' ? 'Admin' : null, member.status === 'INVITED' ? 'Not joined yet' : null, member.phoneNumber]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text variant="caption" style={{ color: toneColor(line.tone) }}>{line.tone === 'even' ? 'settled' : line.text}</Text>
            </Pressable>
          );
        })}

        {isAdmin && !closed ? (
          <View style={s.card}>
            <Text variant="label" style={s.name}>{'Add by phone number'}</Text>
            <Text variant="caption">{'They are added right away and can see the group once they open the app.'}</Text>
            <Input placeholder="Name" value={name} onChangeText={setName} maxLength={60} />
            <Input placeholder="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={16} />
            {formError ? <Text accessibilityLiveRegion="polite" style={s.error}>{formError}</Text> : null}
            <Button disabled={busy} onPress={add} accessibilityLabel="Add person">
              {'Add person'}
            </Button>
          </View>
        ) : null}

        {isAdmin ? (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onPress={toggleComplete}
              accessibilityLabel={closed ? 'Reopen group' : 'Mark group as complete'}
            >
              {closed ? 'Reopen group' : 'Mark as complete'}
            </Button>
            <Button variant="secondary" disabled={busy} onPress={confirmDelete} accessibilityLabel="Delete group">
              {'Delete group'}
            </Button>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
