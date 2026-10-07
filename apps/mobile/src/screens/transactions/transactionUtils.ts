export function formatTransactionCount(count: number) {
  return `${count} transaction${count === 1 ? '' : 's'}`;
}
