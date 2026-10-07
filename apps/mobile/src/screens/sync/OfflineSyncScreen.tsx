import React, {useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Switch, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {Text} from '../../components/Text';
import {kharchivaIcon} from '../../assets';
import {bottomSafeAreaInset} from '../../components/layoutInsets';
import type {RootStackParamList} from '../../navigation/types';
import {colors, radius, spacing, typography} from '../../theme';
import {conflictVersions, syncOverview, type ConflictVersion} from './syncData';

export function OfflineSyncScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncQueued, setSyncQueued] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ConflictVersion['source'] | null>(null);
  const [integrityChecked, setIntegrityChecked] = useState(false);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState(false);

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, {paddingTop: Math.max(insets.top, spacing.sm)}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backGlyph}>‹</Text></Pressable>
        <Image accessibilityLabel="Kharchiva" source={kharchivaIcon} style={styles.brandMark} />
        <Text numberOfLines={1} style={styles.headerTitle}>Kharchiva — Offline &amp; Sync Reconciliation</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}><Text style={styles.profileGlyph}>♙</Text></Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, {paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.lg}]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.connectionBar}>
          <View style={styles.connectionStatus}><View style={styles.connectedDot}/><Text style={styles.connectionText}>{syncQueued ? 'Sync queued · Waiting for confirmation' : syncOverview.connection}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sync FAQ" onPress={() => setFaqExpanded(value => !value)} style={styles.faqButton}><Text style={styles.faqText}>Sync FAQ</Text><Text style={styles.faqIcon}>ⓘ</Text></Pressable>
        </View>
        {faqExpanded ? <View style={styles.faqPanel}><Text style={styles.faqPanelText}>Your entries stay on this device while offline. When connected, queued changes can be reconciled with your cloud ledger.</Text></View> : null}

        <Card style={styles.sanctuaryCard}>
          <View style={styles.sanctuaryIcon}><Text style={styles.shieldGlyph}>♢</Text></View>
          <View style={styles.sanctuaryCopy}>
            <View style={styles.sanctuaryTitleLine}><Text style={styles.cardHeading}>{syncOverview.sanctuaryTitle}</Text><View style={styles.zeroLoss}><Text style={styles.zeroLossText}>{syncOverview.sanctuaryBadge}</Text></View></View>
            <Text style={styles.sanctuaryDescription}>{syncOverview.sanctuaryDescription}</Text>
          </View>
        </Card>

        <Card style={styles.vaultCard}>
          <View style={styles.vaultHeading}>
            <View><Text style={styles.eyebrow}>Vault Health</Text><Text style={styles.vaultTitle}>{syncOverview.vaultTitle}</Text></View>
            <View style={styles.cloudIcon}><Text style={styles.cloudGlyph}>☁</Text></View>
          </View>
          <View style={styles.statGrid}>
            <View style={styles.stat}><Text style={styles.statLabel}>Synced</Text><Text style={styles.statValue}>{syncOverview.synced}</Text></View>
            <View style={styles.stat}><Text style={styles.statAttention}>Review Needed</Text><Text style={styles.statValue}>{syncOverview.reviewNeeded}</Text></View>
            <View style={styles.stat}><Text style={styles.statLabel}>Pending</Text><Text style={styles.statValue}>{syncOverview.pending}</Text></View>
          </View>
          <View style={styles.syncActionLine}>
            <View style={styles.lastSync}><Text style={styles.clockGlyph}>◷</Text><Text style={styles.lastSyncText}>Last sample sync: {syncOverview.lastSync}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry Sync Preview" onPress={() => setSyncQueued(value => !value)} style={styles.forceSyncButton}><Text style={styles.syncGlyph}>⟳</Text><Text style={styles.forceSyncText}>{syncQueued ? 'Preview Queued' : 'Preview Sync'}</Text></Pressable>
          </View>
        </Card>

        <Card style={styles.reconciliationCard}>
          <View style={styles.reconcileHeading}>
            <View style={styles.conflictIcon}><Text style={styles.conflictGlyph}>⤨</Text></View>
            <View style={styles.reconcileCopy}><Text style={styles.cardHeading}>{syncOverview.reconciliationTitle}</Text><Text style={styles.reconcileSubtitle}>{syncOverview.reconciliationSubtitle}</Text></View>
          </View>
          <Text style={styles.reconcileDescription}>{syncOverview.reconciliationDescription}</Text>
          {conflictVersions.map(version => {
            const selected = selectedVersion === version.source;
            const cloud = version.source === 'cloud';
            return (
              <View key={version.source} style={[styles.versionCard, selected && styles.versionSelected]}>
                <View style={styles.versionMeta}>
                  <View style={[styles.sourceBadge, cloud && styles.cloudBadge]}><Text style={[styles.sourceText, cloud && styles.cloudSourceText]}>{version.label}</Text></View>
                  <Text style={styles.deviceText}>{version.device}</Text>
                </View>
                <View style={styles.versionDetails}>
                  <View style={styles.transactionCopy}><Text numberOfLines={1} style={styles.transactionTitle}>{version.title}</Text><Text style={styles.transactionDetail}>{version.detail}</Text></View>
                  <Text style={[styles.amount, cloud && styles.cloudAmount]}>{version.amount}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={version.buttonLabel} accessibilityState={{selected}} onPress={() => setSelectedVersion(version.source)} style={[styles.keepButton, cloud && styles.keepCloudButton, selected && styles.keepChosenButton]}>
                  <Text style={[styles.keepText, cloud && styles.keepCloudText, selected && styles.keepChosenText]}>{selected ? `Selected ${version.source === 'local' ? 'Local' : 'Cloud'} Version` : version.buttonLabel}</Text>
                </Pressable>
              </View>
            );
          })}
          <View style={styles.archiveNote}><Text style={styles.archiveShield}>♢</Text><Text style={styles.archiveText}>{syncOverview.archivalNote}</Text></View>
        </Card>

        <Card style={styles.offlineCard}>
          <Text style={styles.cardHeading}>{syncOverview.offlineTitle}</Text>
          <Text style={styles.offlineDescription}>{syncOverview.offlineDescription}</Text>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Auto-Sync Preview</Text><Text style={styles.preferenceDetail}>Preference preview only; no sync runs</Text></View>
            <Switch accessibilityLabel="Auto-Sync on Cellular" value={autoSyncEnabled} onValueChange={setAutoSyncEnabled} thumbColor={colors.white} trackColor={{false: '#D8D4DD', true: colors.primary}}/>
          </View>
          <View style={styles.integrityRow}>
            <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Database Integrity Preview</Text><Text style={styles.integrityDetail}>{integrityChecked ? 'Preview complete · no database was checked' : syncOverview.integrity}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Run Database Integrity Preview" onPress={() => setIntegrityChecked(true)} style={styles.checkButton}><Text style={styles.checkGlyph}>◉</Text><Text style={styles.checkText}>{integrityChecked ? 'Previewed' : 'Preview'}</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Prepare Offline Snapshot Preview" onPress={() => setSnapshotReady(true)} style={styles.snapshotButton}><Text style={styles.snapshotGlyph}>⇩</Text><Text style={styles.snapshotText}>{snapshotReady ? 'Offline Snapshot Preview Ready (.khv)' : 'Prepare Offline Snapshot Preview (.khv)'}</Text></Pressable>
        </Card>

        <View style={styles.privacyFooter}><Text style={styles.privacyTitle}><Text style={styles.privacyGlyph}>♙ </Text>{syncOverview.privacyTitle}</Text><Text style={styles.privacyDescription}>{syncOverview.privacyDescription}</Text></View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0},
  header: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingBottom: spacing.xs, paddingHorizontal: spacing.md},
  backButton: {alignItems: 'center', height: 38, justifyContent: 'center', width: 28},
  backGlyph: {color: colors.text, fontSize: 35, lineHeight: 40, marginTop: -4},
  brandMark: {height: 28, width: 28},
  headerTitle: {color: '#111111', flex: 1, fontSize: 17, fontWeight: '500'},
  profileButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 3, height: 34, justifyContent: 'center', width: 34},
  profileGlyph: {color: colors.white, fontSize: 18},
  scrollView: {flex: 1},
  content: {gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm},
  connectionBar: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.full, flexDirection: 'row', justifyContent: 'space-between', minHeight: 34, paddingHorizontal: spacing.md},
  connectionStatus: {alignItems: 'center', flexDirection: 'row', flex: 1, gap: spacing.xs},
  connectedDot: {backgroundColor: '#61EFC0', borderRadius: radius.full, height: 8, width: 8},
  connectionText: {color: colors.success, flexShrink: 1, fontSize: typography.xs, letterSpacing: 0.3},
  faqButton: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, paddingLeft: spacing.xs},
  faqText: {color: '#393641', fontSize: typography.xs},
  faqIcon: {color: '#393641', fontSize: typography.sm},
  faqPanel: {backgroundColor: colors.primaryMuted, borderRadius: radius.md, padding: spacing.md},
  faqPanelText: {color: colors.text, fontSize: typography.sm, lineHeight: 20},
  sanctuaryCard: {alignItems: 'flex-start', borderColor: '#F0EFEB', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.lg},
  sanctuaryIcon: {alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: radius.full, height: 42, justifyContent: 'center', width: 42},
  shieldGlyph: {color: colors.primary, fontSize: 20},
  sanctuaryCopy: {flex: 1, gap: spacing.xs},
  sanctuaryTitleLine: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  cardHeading: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  zeroLoss: {backgroundColor: '#61EFC0', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2},
  zeroLossText: {color: colors.success, fontSize: typography.xs},
  sanctuaryDescription: {color: colors.textMuted, fontSize: typography.sm, lineHeight: 23},
  vaultCard: {borderColor: '#F0EFEB', borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg},
  vaultHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  eyebrow: {color: '#393641', fontSize: typography.xs, marginBottom: spacing.xs},
  vaultTitle: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  cloudIcon: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34},
  cloudGlyph: {color: '#393641', fontSize: 19},
  statGrid: {flexDirection: 'row', gap: spacing.sm},
  stat: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.sm, flex: 1, justifyContent: 'center', minHeight: 62, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm},
  statLabel: {color: colors.success, fontSize: typography.xs},
  statAttention: {color: '#985600', fontSize: typography.xs, textAlign: 'center'},
  statValue: {color: colors.text, fontSize: typography.md},
  syncActionLine: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between'},
  lastSync: {alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.xs},
  clockGlyph: {color: colors.text, fontSize: 15},
  lastSyncText: {color: '#393641', flex: 1, fontSize: typography.xs},
  forceSyncButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing.md},
  syncGlyph: {color: colors.white, fontSize: 17, fontWeight: '600'},
  forceSyncText: {color: colors.white, fontSize: typography.sm, fontWeight: '600'},
  reconciliationCard: {borderColor: '#F0EFEB', borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg},
  reconcileHeading: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  conflictIcon: {alignItems: 'center', backgroundColor: '#FFE0BE', borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40},
  conflictGlyph: {color: '#7C4100', fontSize: 20},
  reconcileCopy: {flex: 1, gap: 2},
  reconcileSubtitle: {color: '#393641', fontSize: typography.xs},
  reconcileDescription: {color: colors.textMuted, fontSize: typography.sm, lineHeight: 22},
  versionCard: {backgroundColor: '#F3F2EE', borderColor: 'transparent', borderRadius: radius.md, borderWidth: 1.5, gap: spacing.md, padding: spacing.md},
  versionSelected: {borderColor: colors.primary},
  versionMeta: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  sourceBadge: {backgroundColor: '#E4E2DE', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2},
  cloudBadge: {backgroundColor: '#EADDFC'},
  sourceText: {color: '#393641', fontSize: typography.xs},
  cloudSourceText: {color: colors.primary},
  deviceText: {color: '#393641', fontSize: typography.xs},
  versionDetails: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm},
  transactionCopy: {flex: 1, gap: spacing.xs},
  transactionTitle: {color: '#111111', fontSize: typography.lg, fontWeight: '500'},
  transactionDetail: {color: colors.textMuted, fontSize: typography.xs},
  amount: {color: '#111111', fontSize: 26, fontWeight: '600', letterSpacing: -0.5},
  cloudAmount: {color: colors.primary},
  keepButton: {alignItems: 'center', backgroundColor: '#E2E1DE', borderRadius: radius.full, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md},
  keepCloudButton: {backgroundColor: colors.primary},
  keepChosenButton: {backgroundColor: colors.success},
  keepText: {color: colors.text, fontSize: typography.sm},
  keepCloudText: {color: colors.white},
  keepChosenText: {color: colors.white, fontWeight: '600'},
  archiveNote: {alignItems: 'flex-start', backgroundColor: '#F3F2EE', borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, padding: spacing.md},
  archiveShield: {color: colors.success, fontSize: typography.md},
  archiveText: {color: '#393641', flex: 1, fontSize: typography.xs, letterSpacing: 0.2, lineHeight: 17},
  offlineCard: {borderColor: '#F0EFEB', borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg},
  offlineDescription: {color: colors.textMuted, fontSize: typography.sm, lineHeight: 21},
  preferenceRow: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 62, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  preferenceCopy: {flex: 1, gap: 3},
  preferenceTitle: {color: '#111111', fontSize: typography.md},
  preferenceDetail: {color: colors.text, fontSize: typography.xs},
  integrityRow: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 62, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  integrityDetail: {color: colors.success, fontSize: typography.xs},
  checkButton: {alignItems: 'center', backgroundColor: '#E4E2DE', borderRadius: radius.full, flexDirection: 'row', gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.md},
  checkGlyph: {color: colors.text, fontSize: typography.sm},
  checkText: {color: colors.text, fontSize: typography.xs, fontWeight: '500'},
  snapshotButton: {alignItems: 'center', backgroundColor: '#F3F2EE', borderRadius: radius.full, flexDirection: 'row', gap: spacing.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md},
  snapshotGlyph: {color: colors.text, fontSize: typography.lg},
  snapshotText: {color: colors.text, flexShrink: 1, fontSize: typography.sm, textAlign: 'center'},
  privacyFooter: {alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm},
  privacyTitle: {color: '#393641', fontSize: typography.xs, letterSpacing: 0.7},
  privacyGlyph: {color: colors.success},
  privacyDescription: {color: colors.textMuted, fontSize: typography.xs, lineHeight: 17, textAlign: 'center'},
});
