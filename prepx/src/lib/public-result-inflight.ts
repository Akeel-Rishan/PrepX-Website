import 'server-only';

/**
 * Coalesces only concurrent reads for the same public result. Entries are
 * removed as soon as the lookup settles, so this never serves stale results.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function coalescePublicResultLookup<T>(
  key: string,
  lookup: () => Promise<T>
): Promise<T> {
  const current = inFlight.get(key) as Promise<T> | undefined;
  if (current) return current;

  const pending = lookup().finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}
