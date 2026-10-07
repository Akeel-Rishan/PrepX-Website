/** Bound untrusted pagination before arithmetic or cache lookup. */
export function normalizePage(value: number | undefined): number {
  return Number.isSafeInteger(value) && value! > 0 ? Math.min(value!, 1_000_000) : 1;
}

export function normalizePageSize(value: number | undefined, maximum = 100): number {
  return Number.isSafeInteger(value) && value! > 0 ? Math.min(value!, maximum) : 25;
}
