import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {Text} from '../../components/Text';
import {bottomSafeAreaInset, FIXED_ACTION_SCROLL_GAP} from '../../components/layoutInsets';
import type {RootStackParamList} from '../../navigation/types';
import {colors, radius, spacing, typography} from '../../theme';
import {exportCategories, exportFormats, exportRanges, exportStatementInfo, type ExportCategory, type ExportFormat, type ExportRange} from './exportData';

export function ExportStatementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(exportCategories.map(item => item.id));
  const [selectedRange, setSelectedRange] = useState<ExportRange>(exportRanges[0]);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(exportFormats[0]);
  const allSelected = selectedCategories.length === exportCategories.length;

  const toggleCategory = (category: ExportCategory) => {
    setSelectedCategories(current => current.includes(category.id)
      ? current.filter(id => id !== category.id)
      : [...current, category.id]);
  };

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, {paddingTop: Math.max(insets.top, spacing.md)}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>Export Statement</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="More export options" style={styles.moreButton}>
          <Text style={styles.moreGlyph}>⋮</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
          <Text style={styles.profileGlyph}>♙</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, {paddingBottom: FIXED_ACTION_SCROLL_GAP}]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View style={styles.eyebrow}><Text style={styles.eyebrowIcon}>◆</Text><Text style={styles.eyebrowText}>{exportStatementInfo.badge}</Text></View>
          <Text style={styles.title}>{exportStatementInfo.title}</Text>
          <Text style={styles.introDetail}>Choose the records, date range, and format for your statement.</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionLabel}>SELECT WHAT TO EXPORT</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={allSelected ? 'Deselect all export data' : 'Select all export data'} onPress={() => setSelectedCategories(allSelected ? [] : exportCategories.map(item => item.id))}>
            <Text style={styles.selectAll}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
          </Pressable>
        </View>
        <Card style={styles.categoryCard}>
          {exportCategories.map((category, index) => {
            const selected = selectedCategories.includes(category.id);
            return (
              <Pressable key={category.id} accessibilityRole="checkbox" accessibilityLabel={category.title} accessibilityState={{checked: selected}} onPress={() => toggleCategory(category)} style={[styles.categoryRow, index === exportCategories.length - 1 && styles.lastRow]}>
                <View style={[styles.categoryIcon, category.id === 'transactions' && styles.transactionIcon]}><Text style={styles.categoryGlyph}>{category.id === 'transactions' ? '↕' : category.id === 'budgets' ? '▥' : '◷'}</Text></View>
                <View style={styles.categoryCopy}><Text style={styles.categoryTitle}>{category.title}</Text><Text style={styles.categoryDetail}>{category.detail}</Text></View>
                <Text style={styles.categoryCount}>{category.count}</Text>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? <Text style={styles.checkmark}>✓</Text> : null}</View>
              </Pressable>
            );
          })}
        </Card>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionLabel}>DATE RANGE</Text>
          <View style={styles.customizable}><Text style={styles.calendarGlyph}>▦</Text><Text style={styles.customizableText}>Customizable</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeList}>
          {exportRanges.map(range => {
            const selected = selectedRange.id === range.id;
            return <Pressable key={range.id} accessibilityRole="button" accessibilityLabel={range.label} accessibilityState={{selected}} onPress={() => setSelectedRange(range)} style={[styles.rangeChip, selected && styles.rangeSelected]}><Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>{range.label}{range.id === 'month' ? ' (Sep 2026)' : ''}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionLabel}>FILE FORMAT</Text>
          <Text style={styles.layoutHint}>Choose layout</Text>
        </View>
        <View style={styles.formats}>
          {exportFormats.map(format => {
            const selected = selectedFormat.id === format.id;
            return (
              <Pressable key={format.id} accessibilityRole="radio" accessibilityLabel={`${format.label} ${format.extension}`} accessibilityState={{selected}} onPress={() => setSelectedFormat(format)} style={[styles.formatCard, selected && styles.formatSelected]}>
                <View style={styles.formatTop}><View style={[styles.formatIcon, selected && styles.formatIconSelected]}><Text style={styles.formatGlyph}>{format.icon}</Text></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <Text style={styles.radioCheck}>✓</Text> : null}</View></View>
                <View style={styles.formatNameLine}><Text style={styles.formatName}>{format.label}</Text><Text style={styles.extension}>{format.extension}</Text></View>
                <Text style={styles.formatDetail}>{format.detail}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.localNotice}>
          <View style={styles.lockIcon}><Text style={styles.lockGlyph}>♙</Text></View>
          <View style={styles.localCopy}><Text style={styles.localTitle}>{exportStatementInfo.localTitle}</Text><Text style={styles.localDescription}>{exportStatementInfo.localDescription}</Text></View>
        </View>
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: bottomSafeAreaInset(insets.bottom) + spacing.sm}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Export ${selectedRange.dateLabel} statement (${selectedFormat.label})`} disabled={selectedCategories.length === 0} onPress={() => undefined} style={styles.exportButton}>
          <Text style={styles.downloadGlyph}>⇩</Text><Text numberOfLines={1} style={styles.exportLabel}>Export {selectedRange.dateLabel} Statement ({selectedFormat.label})</Text>
        </Pressable>
        <View style={styles.fileSizeLine}><View style={styles.onlineDot}/><Text style={styles.fileSize}>{exportStatementInfo.fileSize}</Text></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0},
  header: {alignItems: 'center', backgroundColor: colors.background, flexDirection: 'row', gap: spacing.sm, minHeight: 64, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg, zIndex: 1},
  backButton: {alignItems: 'flex-start', height: 44, justifyContent: 'center', width: 34},
  backGlyph: {color: colors.text, fontSize: 42, lineHeight: 46, marginTop: -5},
  headerTitle: {color: '#111111', flex: 1, fontSize: typography.lg, fontWeight: '600'},
  moreButton: {alignItems: 'center', height: 40, justifyContent: 'center', width: 24},
  moreGlyph: {color: '#393641', fontSize: 27, lineHeight: 30},
  profileButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, elevation: 3, height: 40, justifyContent: 'center', width: 40},
  profileGlyph: {color: colors.white, fontSize: 21},
  scrollView: {flex: 1},
  content: {gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg},
  intro: {gap: spacing.sm, marginBottom: spacing.md},
  eyebrow: {alignSelf: 'flex-start', alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  eyebrowIcon: {color: colors.primary, fontSize: typography.sm},
  eyebrowText: {color: '#393641', fontSize: typography.xs, letterSpacing: 1.1},
  title: {color: '#111111', fontSize: 30, fontWeight: '600', letterSpacing: -0.7, lineHeight: 38},
  introDetail: {color: colors.textMuted, fontSize: typography.sm, lineHeight: 20},
  sectionHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs},
  sectionLabel: {color: '#393641', fontSize: typography.xs, letterSpacing: 0.7},
  selectAll: {color: colors.primary, fontSize: typography.sm, fontWeight: '500'},
  categoryCard: {borderColor: '#F0EFEB', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  categoryRow: {alignItems: 'center', borderBottomColor: '#EEECE8', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 70, paddingVertical: spacing.sm},
  lastRow: {borderBottomWidth: 0},
  categoryIcon: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42},
  transactionIcon: {backgroundColor: colors.successMuted},
  categoryGlyph: {color: colors.primary, fontSize: 22, fontWeight: '600'},
  categoryCopy: {flex: 1, gap: 2},
  categoryTitle: {color: colors.text, fontSize: typography.md, fontWeight: '500'},
  categoryDetail: {color: colors.textMuted, fontSize: typography.xs},
  categoryCount: {color: colors.textMuted, fontSize: typography.xs},
  checkbox: {alignItems: 'center', borderColor: '#D9D5DD', borderRadius: 6, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 22},
  checkboxSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  checkmark: {color: colors.white, fontSize: 15, fontWeight: '700', lineHeight: 18},
  customizable: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs},
  calendarGlyph: {color: colors.success, fontSize: 17},
  customizableText: {color: colors.success, fontSize: typography.sm},
  rangeList: {gap: spacing.sm, paddingRight: spacing.lg},
  rangeChip: {backgroundColor: '#F0EFEB', borderRadius: radius.full, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg},
  rangeSelected: {backgroundColor: '#111111'},
  rangeText: {color: '#393641', fontSize: typography.sm},
  rangeTextSelected: {color: colors.white},
  layoutHint: {color: colors.textMuted, fontSize: typography.sm},
  formats: {flexDirection: 'row', gap: spacing.sm},
  formatCard: {backgroundColor: colors.surface, borderColor: '#F0EFEB', borderRadius: radius.lg, borderWidth: 1, elevation: 1, flex: 1, minHeight: 150, padding: spacing.md},
  formatSelected: {borderColor: colors.primary, borderWidth: 2, padding: spacing.md - 1},
  formatTop: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md},
  formatIcon: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.sm, height: 38, justifyContent: 'center', width: 38},
  formatIconSelected: {backgroundColor: colors.successMuted},
  formatGlyph: {color: '#393641', fontSize: 21},
  radio: {alignItems: 'center', backgroundColor: '#F0EFEB', borderRadius: radius.full, height: 20, justifyContent: 'center', width: 20},
  radioSelected: {backgroundColor: colors.primary},
  radioCheck: {color: colors.white, fontSize: 13, fontWeight: '700'},
  formatNameLine: {alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs},
  formatName: {color: '#111111', fontSize: typography.md, fontWeight: '500'},
  extension: {backgroundColor: '#F0EFEB', borderRadius: 5, color: colors.textMuted, fontSize: typography.xs, paddingHorizontal: spacing.xs, paddingVertical: 2},
  formatDetail: {color: colors.textMuted, fontSize: typography.xs, lineHeight: 17},
  localNotice: {alignItems: 'flex-start', backgroundColor: '#F3F3EF', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.lg},
  lockIcon: {alignItems: 'center', backgroundColor: '#E7E4DE', borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42},
  lockGlyph: {color: colors.primary, fontSize: 21},
  localCopy: {flex: 1, gap: spacing.xs},
  localTitle: {color: colors.text, fontSize: typography.md, fontWeight: '500'},
  localDescription: {color: '#393641', fontSize: typography.sm, lineHeight: 22},
  footer: {backgroundColor: colors.background, gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md},
  exportButton: {alignItems: 'center', backgroundColor: '#7839E8', borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.md},
  downloadGlyph: {color: colors.white, fontSize: 23, fontWeight: '700'},
  exportLabel: {color: colors.white, flexShrink: 1, fontSize: typography.md, fontWeight: '600'},
  fileSizeLine: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center'},
  onlineDot: {backgroundColor: colors.success, borderRadius: radius.full, height: 7, width: 7},
  fileSize: {color: '#393641', fontSize: typography.xs},
});
