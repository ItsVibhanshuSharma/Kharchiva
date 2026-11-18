import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { showSnackbar } from '../../components/snackbar';
import { Plus, Trash2 } from '../../components/icons';
import type { ListEntryType } from '../../database/repositories/CatalogRepository';
import {
  addCustomCategory,
  addPaymentSource,
  removeCustomCategory,
  removePaymentSource,
  useCatalog,
} from '../../features/catalog/catalogStore';
import { NewItemSheet } from '../../features/catalog/NewItemSheet';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { DEFAULT_PAYMENT_SOURCES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../theme/categories';

type Adding = { kind: 'category'; type: ListEntryType } | { kind: 'payment' } | null;

function confirmRemove(name: string, onConfirm: () => Promise<void>) {
  Alert.alert(`"${name}" hatayein?`, 'Purani entries mein ye naam waise hi rahega. Bas aage ki list se hat jayega.', [
    { text: 'Rehne do', style: 'cancel' },
    {
      text: 'Hatao',
      style: 'destructive',
      onPress: () => {
        onConfirm()
          .then(() => showSnackbar({ message: `"${name}" hata diya` }))
          .catch(() => showSnackbar({ tone: 'error', message: 'Hat nahi paya. Phir try karo.' }));
      },
    },
  ]);
}

export function ManageListsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const catalog = useCatalog();
  const [adding, setAdding] = useState<Adding>(null);

  const categorySection = (type: ListEntryType) => {
    const builtIn: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const custom = catalog.customCategories.filter(item => item.type === type);
    return (
      <View style={styles.section}>
        <Text variant="label" style={styles.sectionLabel}>{type === 'income' ? 'INCOME KI CATEGORIES' : 'KHARCH KI CATEGORIES'}</Text>
        <View style={styles.card}>
          {custom.length === 0 ? <Text variant="caption">Abhi aapki koi apni category nahi hai.</Text> : null}
          {custom.map(item => (
            <View key={item.id} style={styles.row}>
              <CategoryIcon category={item.name} type={type} size={36} />
              <Text variant="label" style={styles.rowName}>{item.name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                hitSlop={8}
                onPress={() => confirmRemove(item.name, () => removeCustomCategory(item.id))}
                style={styles.removeButton}
              >
                <Trash2 color={colors.destructive} size={18} />
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={type === 'income' ? 'Add income category' : 'Add expense category'}
            onPress={() => setAdding({ kind: 'category', type })}
            style={styles.addRow}
          >
            <Plus color={colors.primary} size={18} strokeWidth={2.6} />
            <Text variant="label" style={styles.addText}>Nayi category</Text>
          </Pressable>
        </View>
        <Text variant="caption" style={styles.defaults}>{`Default: ${builtIn.join(', ')}`}</Text>
      </View>
    );
  };

  return (
    <Screen style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) }]}>
      <AppHeader title="Categories & payment" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}>
        {categorySection('expense')}
        {categorySection('income')}

        <View style={styles.section}>
          <Text variant="label" style={styles.sectionLabel}>PAYMENT SOURCES</Text>
          <View style={styles.card}>
            {catalog.paymentSources.length === 0 ? <Text variant="caption">Jaise "HDFC Credit Card" ya "Paytm Wallet" jodo.</Text> : null}
            {catalog.paymentSources.map(item => (
              <View key={item.id} style={styles.row}>
                <Text variant="label" style={styles.rowName}>{item.name}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                  hitSlop={8}
                  onPress={() => confirmRemove(item.name, () => removePaymentSource(item.id))}
                  style={styles.removeButton}
                >
                  <Trash2 color={colors.destructive} size={18} />
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Add payment source" onPress={() => setAdding({ kind: 'payment' })} style={styles.addRow}>
              <Plus color={colors.primary} size={18} strokeWidth={2.6} />
              <Text variant="label" style={styles.addText}>Naya payment source</Text>
            </Pressable>
          </View>
          <Text variant="caption" style={styles.defaults}>{`Default: ${DEFAULT_PAYMENT_SOURCES.join(', ')}`}</Text>
        </View>
      </ScrollView>

      <NewItemSheet
        onClose={() => setAdding(null)}
        onSave={async (name, emoji) => {
          if (adding?.kind === 'payment') await addPaymentSource(name);
          else if (adding?.kind === 'category') await addCustomCategory({ name, type: adding.type, emoji });
          showSnackbar({ message: `"${name.trim()}" jud gaya` });
        }}
        placeholder={adding?.kind === 'payment' ? 'Jaise: HDFC Credit Card' : 'Jaise: Gym'}
        title={adding?.kind === 'payment' ? 'Naya payment source' : 'Nayi category'}
        visible={adding !== null}
        withEmoji={adding?.kind === 'category'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  section: { gap: spacing.xs },
  sectionLabel: { color: colors.textMuted, letterSpacing: 0.6 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 44 },
  rowName: { color: colors.text, flex: 1, fontSize: 15 },
  removeButton: { alignItems: 'center', backgroundColor: '#FDECEE', borderRadius: radius.full, height: 34, justifyContent: 'center', width: 34 },
  addRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 40 },
  addText: { color: colors.primary },
  defaults: { marginHorizontal: 2 },
});
