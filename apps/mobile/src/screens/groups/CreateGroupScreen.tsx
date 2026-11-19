import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Trash2 } from '../../components/icons';
import { errorMessage } from '../../features/groups/groupFormat';
import { getGroupsApi, normalizePhone } from '../../features/groups/groupsApi';
import type { NewMember } from '../../features/groups/types';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { groupStyles as s } from './groupStyles';

type Row = { key: number; name: string; phone: string };

export function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key: number, patch: Partial<Row>) =>
    setRows(current => current.map(row => (row.key === key ? { ...row, ...patch } : row)));

  const submit = async () => {
    if (!title.trim()) return setError('Give the group a name, like "Goa Trip".');
    const members: NewMember[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.name.trim() && !row.phone.trim()) continue;
      const phone = normalizePhone(row.phone);
      if (!row.name.trim() || !phone) return setError('Each person needs a name and a valid 10-digit mobile number.');
      if (seen.has(phone)) return setError('The same number is added twice.');
      seen.add(phone);
      members.push({ displayName: row.name.trim(), phoneNumber: phone });
    }
    setSaving(true);
    setError('');
    try {
      const group = await getGroupsApi().create({ title, members });
      navigation.replace('GroupDetail', { groupId: group.id, justCreated: true });
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  };

  return (
    <Screen style={[s.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.headerWrap}>
          <AppHeader title="New group" showBack onBack={() => navigation.goBack()} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Input label="Group name" placeholder="e.g. Goa Trip" value={title} onChangeText={setTitle} maxLength={80} />
          <Text variant="label" style={s.sectionTitle}>{'Add friends (optional)'}</Text>
          <Text variant="caption">
            {'Add them by phone number now, or share the invite link on the next screen. They join when they open the app.'}
          </Text>
          {rows.map(row => (
            <View key={row.key} style={[s.card, s.row]}>
              <View style={s.flex}>
                <Input placeholder="Name" value={row.name} onChangeText={value => update(row.key, { name: value })} maxLength={60} />
                <Input
                  placeholder="Mobile number"
                  keyboardType="phone-pad"
                  value={row.phone}
                  onChangeText={value => update(row.key, { phone: value })}
                  maxLength={16}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove this person"
                hitSlop={8}
                onPress={() => setRows(current => current.filter(item => item.key !== row.key))}
              >
                <Trash2 color={colors.destructive} size={20} />
              </Pressable>
            </View>
          ))}
          <Button
            variant="secondary"
            accessibilityLabel="Add a person"
            onPress={() => {
              setRows(current => [...current, { key: nextKey, name: '', phone: '' }]);
              setNextKey(nextKey + 1);
            }}
          >
            {'Add a person'}
          </Button>
          {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
          <Button disabled={saving} onPress={submit} accessibilityLabel="Create group">
            {saving ? 'Creating…' : 'Create group'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
