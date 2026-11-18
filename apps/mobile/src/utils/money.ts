/** Money is stored as integer paise; these format it for display in INR. */

export function formatRupees(amountPaise: number): string {
  const absolute = Math.abs(amountPaise);
  return `₹${(absolute / 100).toLocaleString('en-IN', {
    minimumFractionDigits: absolute % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Always carries a sign so the user can tell at a glance: +₹1,35,000 or −₹5,000. */
export function formatSignedRupees(amountPaise: number): string {
  if (amountPaise === 0) return formatRupees(0);
  return `${amountPaise > 0 ? '+' : '−'}${formatRupees(amountPaise)}`;
}
