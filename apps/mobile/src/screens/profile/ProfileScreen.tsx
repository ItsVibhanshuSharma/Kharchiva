import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAVIGATION_CONTENT_INSET, BottomNavigation } from '../../components/BottomNavigation';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { kharchivaIcon } from '../../assets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';
import {
  profileAccountActions,
  profileData,
  profileSections,
  type ProfileSettingsRow,
} from './profileData';

function ProfileRow({
  row,
  onPress,
  toggleValue,
  onToggle,
  last,
}: {
  row: ProfileSettingsRow;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  last?: boolean;
}) {
  const iconTone = row.iconTone ?? 'gray';
  const iconBackground = {
    violet: colors.primaryMuted,
    green: colors.successMuted,
    amber: '#F8EBDD',
    gray: '#F0EFEB',
    red: '#FDECEE',
  }[iconTone];
  const iconColor = {
    violet: colors.primary,
    green: colors.success,
    amber: colors.warning,
    gray: colors.text,
    red: colors.destructive,
  }[iconTone];
  const badgeBackground = {
    violet: colors.primary,
    green: colors.successMuted,
    amber: '#F8EBDD',
    red: '#FDECEE',
  }[row.badgeTone ?? 'violet'];
  const badgeColor = row.badgeTone === 'green'
    ? colors.success
    : row.badgeTone === 'red'
      ? colors.destructive
      : row.badgeTone === 'amber'
        ? colors.warning
        : colors.white;

  return (
    <Pressable
      accessibilityRole={row.toggle ? 'switch' : 'button'}
      accessibilityLabel={row.title}
      accessibilityState={row.toggle ? {checked: Boolean(toggleValue)} : undefined}
      onPress={row.toggle ? undefined : onPress}
      style={[
        styles.row,
        row.id === 'sources' && styles.mutedRow,
        last && styles.lastRow,
      ]}
    >
      <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
        <Text style={[styles.rowIconText, {color: iconColor}]}>{row.icon}</Text>
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={2} style={[styles.rowTitle, row.destructive && styles.destructiveTitle]}>
            {row.title}
          </Text>
          {row.statusDot ? <View style={styles.statusDot} /> : null}
          {row.badge ? (
            <View style={[styles.badge, {backgroundColor: badgeBackground}]}>
              <Text numberOfLines={1} style={[styles.badgeText, {color: badgeColor}]}>
                {row.badge}
              </Text>
            </View>
          ) : null}
        </View>
        {row.detail ? <Text numberOfLines={1} style={styles.rowDetail}>{row.detail}</Text> : null}
      </View>
      {row.time ? (
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{row.time}</Text>
        </View>
      ) : null}
      {row.toggle ? (
        <Switch
          accessibilityLabel={`${row.title} toggle`}
          onValueChange={onToggle}
          thumbColor={colors.white}
          trackColor={{false: '#D8D4DD', true: colors.primary}}
          value={Boolean(toggleValue)}
        />
      ) : row.trailingIcon ? (
        <Text style={styles.trailingIcon}>{row.trailingIcon}</Text>
      ) : (
        <Text style={[styles.rowChevron, row.destructive && styles.destructiveTitle]}>›</Text>
      )}
    </Pressable>
  );
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [insightsEnabled, setInsightsEnabled] = useState(true);

  const openRow = (row: ProfileSettingsRow) => {
    if (row.id === 'edit-profile') {
      navigation.navigate('ProfileSetup');
    } else if (row.route) {
      navigation.navigate(row.route);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, {paddingTop: Math.max(insets.top, spacing.md)}]}>
        <View style={styles.brand}>
          <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandMark} />
          <Text style={styles.brandName}>Kharchiva</Text>
        </View>
        <View style={styles.headerProfile}><Text style={styles.headerProfileGlyph}>♙</Text></View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileCard}>
          <View style={styles.profileMain}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}><Text style={styles.avatarText}>VS</Text></View>
              <View style={styles.verified}><Text style={styles.verifiedText}>✓</Text></View>
            </View>
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.profileName}>{profileData.name}</Text>
              <Text numberOfLines={1} style={styles.profileContact}>
                {profileData.email} · {profileData.phone}
              </Text>
            </View>
          </View>
          <View style={styles.profileFooter}>
            <Text style={styles.memberSince}>{profileData.memberSince}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
              onPress={() => navigation.navigate('ProfileSetup')}
              style={styles.editButton}
            >
              <Text style={styles.editGlyph}>✎</Text>
              <Text style={styles.editText}>Edit Profile</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.securityStrip}>
          <Text style={styles.securityGlyph}>♙</Text>
        </View>

        {profileSections.map(section => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Card style={styles.sectionCard}>
              {section.rows.map((row, index) => (
                <ProfileRow
                  key={row.id}
                  row={row}
                  last={index === section.rows.length - 1}
                  onPress={() => openRow(row)}
                  toggleValue={row.id === 'daily-reminder' ? dailyReminderEnabled : insightsEnabled}
                  onToggle={row.id === 'daily-reminder' ? setDailyReminderEnabled : setInsightsEnabled}
                />
              ))}
            </Card>
          </View>
        ))}

        <Card style={styles.accountCard}>
          {profileAccountActions.map((row, index) => (
            <ProfileRow
              key={row.id}
              row={row}
              last={index === profileAccountActions.length - 1}
              onPress={() => openRow(row)}
            />
          ))}
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}><Text style={styles.footerGlyph}>♧ </Text>{profileData.footerTitle}</Text>
          <Text style={styles.footerDetail}>{profileData.footerDetail}</Text>
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
          } else if (id === 'reports') {
            navigation.navigate('Reports');
          }
        }}
        items={[
          {id: 'home', label: 'Home'},
          {id: 'transactions', label: 'Transaction'},
          {id: 'add', label: '+'},
          {id: 'reports', label: 'Report'},
          {id: 'profile', label: 'Profile', active: true},
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  brand: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm},
  brandMark: {height: 30, width: 30},
  brandName: {color: colors.text, fontSize: typography.lg, fontWeight: '500'},
  headerProfile: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34},
  headerProfileGlyph: {color: colors.white, fontSize: 18},
  scrollView: {flex: 1},
  content: {gap: spacing.md, paddingBottom: BOTTOM_NAVIGATION_CONTENT_INSET, paddingHorizontal: spacing.lg},
  profileCard: {borderColor: '#F0EFEB', borderRadius: radius.md, elevation: 0, padding: spacing.md},
  profileMain: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  avatarWrap: {height: 56, position: 'relative', width: 56},
  avatar: {alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 56, justifyContent: 'center', width: 56},
  avatarText: {color: colors.primary, fontSize: typography.lg, fontWeight: '500'},
  verified: {alignItems: 'center', backgroundColor: colors.success, borderColor: colors.white, borderRadius: radius.full, borderWidth: 2, bottom: -3, height: 22, justifyContent: 'center', position: 'absolute', right: -3, width: 22},
  verifiedText: {color: colors.white, fontSize: 12, fontWeight: '700'},
  profileCopy: {flex: 1, minWidth: 0},
  profileName: {color: colors.text, fontSize: typography.lg, fontWeight: '600'},
  profileContact: {color: colors.textMuted, fontSize: typography.sm, marginTop: 2},
  profileFooter: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md},
  memberSince: {color: colors.textMuted, fontSize: typography.xs},
  editButton: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  editGlyph: {color: colors.primary, fontSize: typography.sm},
  editText: {color: colors.text, fontSize: typography.xs},
  securityStrip: {alignItems: 'flex-end', backgroundColor: '#BDF6DD', borderRadius: radius.md, height: 48, justifyContent: 'center', paddingHorizontal: spacing.lg},
  securityGlyph: {color: '#004B36', fontSize: 17},
  section: {gap: spacing.xs},
  sectionHeading: {color: colors.text, fontSize: 9, letterSpacing: 0.35, marginHorizontal: 2},
  sectionCard: {borderColor: '#F0EFEB', borderRadius: radius.md, elevation: 0, overflow: 'hidden', padding: 0},
  row: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  mutedRow: {backgroundColor: colors.surfaceMuted},
  lastRow: {borderBottomWidth: 0},
  rowIcon: {alignItems: 'center', borderRadius: radius.full, flexShrink: 0, height: 36, justifyContent: 'center', width: 36},
  rowIconText: {fontSize: 17, fontWeight: '600'},
  rowCopy: {flex: 1, gap: 1, minWidth: 0},
  rowTitleLine: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, minWidth: 0},
  rowTitle: {color: colors.text, flexShrink: 1, fontSize: typography.md, fontWeight: '500'},
  rowDetail: {color: colors.textMuted, fontSize: typography.xs},
  statusDot: {backgroundColor: colors.success, borderRadius: radius.full, height: 7, width: 7},
  badge: {borderRadius: radius.full, flexShrink: 0, maxWidth: 142, paddingHorizontal: spacing.sm, paddingVertical: 3},
  badgeText: {fontSize: 9},
  timeBadge: {backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 3},
  timeText: {color: colors.text, fontSize: 9},
  trailingIcon: {color: colors.textMuted, fontSize: 17, marginLeft: spacing.xs},
  rowChevron: {color: colors.textMuted, fontSize: 22, lineHeight: 24, marginLeft: spacing.xs},
  destructiveTitle: {color: colors.destructive},
  accountCard: {borderColor: '#F0EFEB', borderRadius: radius.md, elevation: 0, marginTop: spacing.xs, padding: 0},
  footer: {alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md},
  footerTitle: {color: colors.text, fontSize: typography.xs},
  footerGlyph: {color: colors.primary},
  footerDetail: {color: colors.textMuted, fontSize: 9},
});
