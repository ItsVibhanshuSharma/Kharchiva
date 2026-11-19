import { t } from '../../i18n/i18n';

export function formatTransactionCount(count: number) {
  return t(count === 1 ? '{n} transaction' : '{n} transactions', { n: count });
}
