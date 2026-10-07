import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { bottomSafeAreaInset, fixedFooterContentInset } from '../../components/layoutInsets';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

const categories = ['Food & Dining', 'Groceries', 'Travel', 'Shopping', 'Bills', 'Health'];
const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card'];
const SAVE_BUTTON_HEIGHT = 56;
const SAVE_FOOTER_TOP_SPACING = spacing.md;
const CONTENT_CLEARANCE_SPACING = spacing.xl;

export function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const footerBottomInset = bottomSafeAreaInset(insets.bottom);
  const scrollBottomClearance = fixedFooterContentInset(
    SAVE_BUTTON_HEIGHT + SAVE_FOOTER_TOP_SPACING,
    insets.bottom,
    CONTENT_CLEARANCE_SPACING,
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, spacing.md),
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <AppHeader
          title="Add Expense"
          showBack
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollBottomClearance },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.amountCard}>
            <Text variant="caption" style={styles.amountLabel}>SPENT AMOUNT</Text>
            <Text variant="title" style={styles.amount}>
              ₹850
            </Text>
            <View style={styles.amountChips}>
              {['+₹50', '+₹100', '+₹500', '+₹1,000'].map(value => (
                <Text key={value} variant="label" style={styles.amountChip}>{value}</Text>
              ))}
            </View>
          </Card>

          <View style={styles.categoryWrap}>
            <View style={styles.sectionHeader}>
              <Text variant="label" style={styles.categoryLabel}>CATEGORY</Text>
              <Text variant="label" style={styles.selectedLabel}>Food &amp; Dining</Text>
            </View>
            <View style={styles.categoryList}>
              {categories.map((category, index) => (
                <View
                  key={category}
                  style={[
                    styles.categoryCard,
                    index === 0 && styles.selectedCategory,
                  ]}
                >
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryGlyph}>
                      {['✣', '⌕', '↗', '▢', '≡', '▤'][index]}
                    </Text>
                  </View>
                  <Text
                    variant="body"
                    numberOfLines={1}
                    style={[styles.categoryText, index === 0 && styles.selectedCategoryText]}
                  >
                    {category}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.paymentSection}>
            <View style={styles.sectionHeader}>
              <Text variant="label" style={styles.categoryLabel}>PAID THROUGH</Text>
              <Text variant="caption">UPI</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.paymentList}>
                {paymentMethods.map((method, index) => (
                  <Text
                    key={method}
                    variant="label"
                    style={[styles.paymentChip, index === 0 && styles.selectedPayment]}
                  >
                    {method}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>

          <Card style={styles.detailsCard}>
            <Input label="Merchant" placeholder="Swiggy" />
            <View style={styles.detailDivider} />
            <Input label="Date" placeholder="Today, 10:30 AM" />
            <View style={styles.detailDivider} />
            <Input label="Note" placeholder="Dinner delivery" />
          </Card>

        </ScrollView>
        <View style={[styles.actions, { paddingBottom: footerBottomInset }]}>
          <Button style={styles.saveButton}>✓  Save Expense</Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: 0 },
  content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  amountCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
  },
  amountLabel: { alignSelf: 'flex-start', fontWeight: '600' },
  amount: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 52,
    marginVertical: spacing.sm,
  },
  amountChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  amountChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    color: colors.text,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryWrap: { marginBottom: spacing.lg },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  categoryLabel: { color: colors.textMuted, letterSpacing: 0.6 },
  selectedLabel: { color: colors.primary },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 126,
    padding: spacing.sm,
  },
  selectedCategory: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  categoryGlyph: { color: colors.textMuted, fontSize: 24 },
  categoryText: { color: colors.text, fontSize: 14, lineHeight: 18 },
  selectedCategoryText: { color: colors.white },
  paymentSection: { marginBottom: spacing.lg },
  paymentList: { flexDirection: 'row', gap: spacing.sm },
  paymentChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    color: colors.text,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectedPayment: { backgroundColor: colors.text, borderColor: colors.text, color: colors.white },
  detailsCard: { borderRadius: radius.xl, gap: spacing.md, padding: spacing.lg },
  detailDivider: { backgroundColor: colors.border, height: 1 },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: SAVE_FOOTER_TOP_SPACING,
  },
  saveButton: { height: SAVE_BUTTON_HEIGHT },
});
