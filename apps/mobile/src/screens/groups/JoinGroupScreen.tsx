import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { errorMessage } from '../../features/groups/groupFormat';
import { getGroupsApi } from '../../features/groups/groupsApi';
import { parseInviteCode } from '../../features/groups/inviteLink';
import type { InvitePreview } from '../../features/groups/types';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';
import { groupStyles as s } from './groupStyles';

/** Opened from an invite link (code is filled in) or from "Join with link or code". */
export function JoinGroupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'JoinGroup'>>();
  const [text, setText] = useState(route.params?.code ?? '');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const code = parseInviteCode(text);

  // A code from a tapped link is looked up straight away.
  useEffect(() => {
    if (route.params?.code) lookUp(route.params.code);
  }, [route.params?.code]);

  const lookUp = async (value: string | null) => {
    if (!value) return setError('That does not look like an invite link or code.');
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      setPreview(await getGroupsApi().previewInvite(value));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (!code) return;
    setBusy(true);
    setError('');
    try {
      const group = await getGroupsApi().join(code);
      navigation.reset({
        index: 1,
        routes: [{ name: 'Groups' }, { name: 'GroupDetail', params: { groupId: group.id } }],
      });
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: 'Home' }] }));

  return (
    <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={s.headerWrap}>
        <AppHeader title="Join a group" showBack onBack={goBack} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Invite link or code"
          placeholder="Paste the link or type the code"
          autoCapitalize="none"
          autoCorrect={false}
          value={text}
          onChangeText={value => {
            setText(value);
            setPreview(null);
            setError('');
          }}
        />
        {busy ? <ActivityIndicator accessibilityLabel="Loading" color="#6817D9" /> : null}
        {preview ? (
          <View style={s.card}>
            <Text variant="label" style={s.name}>{preview.title}</Text>
            <Text variant="caption">{`${preview.memberCount} people${preview.status === 'CLOSED' ? ' · Completed' : ''}`}</Text>
          </View>
        ) : null}
        {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
        {preview ? (
          <Button disabled={busy || preview.status === 'CLOSED'} onPress={join} accessibilityLabel="Join this group">
            {'Join group'}
          </Button>
        ) : (
          <Button disabled={busy || !text.trim()} onPress={() => lookUp(code)} accessibilityLabel="Find group">
            {'Find group'}
          </Button>
        )}
      </ScrollView>
    </Screen>
  );
}
