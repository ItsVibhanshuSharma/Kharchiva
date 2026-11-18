import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ChevronRight, EyeOff, FileText, KeyRound, LogOut, Pencil, Smartphone, Tags, Target } from '../../components/icons';
import { useMpinEnabled } from '../../features/mpin/mpinStatus';
import { setPrivacyOn, usePrivacy } from '../../features/privacy/privacy';
import { appTabItems, navigateToTab } from '../../navigation/appTabs';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { APP_VERSION, initialsOf, profileData } from './profileData';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hidden } = usePrivacy();
  const mpinEnabled = useMpinEnabled();

  // Demo sign-in: logging out returns to the start of the flow. Entries stay on the phone.
  const logOut = () => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <View style={styles.header}>
        <Text variant="heading" style={styles.title}>Profile</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(profileData.name)}</Text>
          </View>
          <View style={styles.identity}>
            <Text variant="label" numberOfLines={1} style={styles.name}>{profileData.name}</Text>
            <Text variant="caption" numberOfLines={1}>{profileData.phone}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
            hitSlop={8}
            onPress={() => navigation.navigate('ProfileSetup')}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
          >
            <Pencil color={colors.primary} size={18} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.infoIcon}>
            <Smartphone color={colors.primary} size={20} />
          </View>
          <View style={styles.identity}>
            <Text variant="label" style={styles.rowTitle}>Saved on this phone</Text>
            <Text variant="caption">Your entries stay on this device. Cloud sync is coming later.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.infoIcon}>
            <EyeOff color={colors.primary} size={20} />
          </View>
          <View style={styles.identity}>
            <Text variant="label" style={styles.rowTitle}>Privacy mode</Text>
            <Text variant="caption">Amounts ki jagah -- dikhega, taaki koi aapki income na dekh sake</Text>
          </View>
          <Switch
            accessibilityLabel="Privacy mode"
            value={hidden}
            onValueChange={setPrivacyOn}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="MPIN"
          onPress={() => navigation.navigate('Mpin')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.infoIcon}>
            <KeyRound color={colors.primary} size={20} />
          </View>
          <View style={styles.identity}>
            <Text variant="label" style={styles.rowTitle}>MPIN</Text>
            <Text variant="caption">{mpinEnabled ? 'Chalu hai. Badlo ya hata do' : 'App kholne par MPIN lagao'}</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Budget"
          onPress={() => navigation.navigate('Budget')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.infoIcon}>
            <Target color={colors.primary} size={20} />
          </View>
          <View style={styles.identity}>
            <Text variant="label" style={styles.rowTitle}>Budget (optional)</Text>
            <Text variant="caption">Category ki mahine ki limit lagao</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Categories and payment sources"
          onPress={() => navigation.navigate('ManageLists')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.infoIcon}>
            <Tags color={colors.primary} size={20} />
          </View>
          <View style={styles.identity}>
            <Text variant="label" style={styles.rowTitle}>Categories & payment</Text>
            <Text variant="caption">Apni categories aur cards jodo</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Statement download"
          onPress={() => navigation.navigate('Statement')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.infoIcon}>
            <FileText color={colors.primary} size={20} />
          </View>
          <View style={styles.identity}>
            <Text variant="label" style={styles.rowTitle}>Statement download</Text>
            <Text variant="caption">Koi bhi dates chuno, PDF lo</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log Out"
          onPress={logOut}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={[styles.infoIcon, styles.logoutIcon]}>
            <LogOut color={colors.destructive} size={20} />
          </View>
          <Text variant="label" style={[styles.rowTitle, styles.logoutText]}>Log Out</Text>
          <ChevronRight color={colors.textMuted} size={20} />
        </Pressable>

        <Text variant="caption" style={styles.version}>{`Kharchiva v${APP_VERSION}`}</Text>
      </ScrollView>
      <BottomNavigation onSelect={id => navigateToTab(navigation, id)} items={appTabItems('profile')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { fontSize: 24, lineHeight: 30 },
  scrollView: { flex: 1 },
  content: { gap: spacing.md, paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, height: 56, justifyContent: 'center', width: 56 },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: '700' },
  identity: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 17 },
  editButton: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40 },
  infoIcon: { alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  rowTitle: { color: colors.text, fontSize: 15 },
  logoutIcon: { backgroundColor: '#FDECEE' },
  logoutText: { color: colors.destructive, flex: 1 },
  pressed: { opacity: 0.7 },
  version: { marginTop: spacing.sm, textAlign: 'center' },
});
