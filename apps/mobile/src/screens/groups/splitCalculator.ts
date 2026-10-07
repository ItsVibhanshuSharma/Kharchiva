import type {SplitMode} from './splitExpenseData';

export type SplitCalculation = {
  shares: Record<string, number>;
  totalCents: number;
  allocatedCents: number;
  remainingCents: number;
  selectedCount: number;
  exactMatch: boolean;
};

export function parseRupeesToPaise(value: string): number {
  const normalized = value.replace(/[^\d.]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

export function formatINR(cents: number): string {
  const rupees = Math.abs(cents) / 100;
  const integer = Math.floor(rupees).toString();
  const lastThree = integer.slice(-3);
  const leading = integer.slice(0, -3);
  const grouped = leading
    ? `${leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree;
  const fraction = Math.abs(cents) % 100;
  const formatted = fraction === 0 ? grouped : `${grouped}.${String(fraction).padStart(2, '0')}`;
  return `${cents < 0 ? '−' : ''}₹${formatted}`;
}

export function allocateWeightedCents(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0 || totalCents <= 0) {
    return weights.map(() => 0);
  }
  const safeWeights = weights.map(weight => Number.isFinite(weight) ? Math.max(0, weight) : 0);
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = weightTotal > 0 ? safeWeights : safeWeights.map(() => 1);
  const normalizedTotal = normalizedWeights.reduce((sum, weight) => sum + weight, 0);
  const precise = normalizedWeights.map(weight => (totalCents * weight) / normalizedTotal);
  const shares = precise.map(Math.floor);
  let remaining = totalCents - shares.reduce((sum, cents) => sum + cents, 0);
  const remainderOrder = precise
    .map((value, index) => ({index, remainder: value - Math.floor(value)}))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    shares[remainderOrder[index % remainderOrder.length].index] += 1;
  }
  return shares;
}

export function calculateSplit(
  totalCents: number,
  participantIds: string[],
  mode: SplitMode,
  values: Record<string, string>,
): SplitCalculation {
  const safeTotal = Math.max(0, Math.round(totalCents));
  const rawValues = participantIds.map(id => Number(values[id] ?? '0'));
  let shareValues: number[];

  if (mode === 'equal' || mode === 'shares') {
    const weights = mode === 'equal' ? participantIds.map(() => 1) : rawValues;
    shareValues = allocateWeightedCents(safeTotal, weights);
  } else if (mode === 'percent') {
    const percentages = rawValues.map(value => Number.isFinite(value) ? Math.max(0, value) : 0);
    const percentageTotal = percentages.reduce((sum, value) => sum + value, 0);
    shareValues = Math.abs(percentageTotal - 100) < 0.000001
      ? allocateWeightedCents(safeTotal, percentages)
      : percentages.map(value => Math.round((safeTotal * value) / 100));
  } else {
    shareValues = rawValues.map(value => Number.isFinite(value) ? parseRupeesToPaise(String(value)) : 0);
  }

  const shares = Object.fromEntries(participantIds.map((id, index) => [id, shareValues[index] ?? 0]));
  const allocatedCents = shareValues.reduce((sum, cents) => sum + cents, 0);
  const remainingCents = safeTotal - allocatedCents;
  return {
    shares,
    totalCents: safeTotal,
    allocatedCents,
    remainingCents,
    selectedCount: participantIds.length,
    exactMatch: participantIds.length > 0 && remainingCents === 0,
  };
}
