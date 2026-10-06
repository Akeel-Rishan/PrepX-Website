import 'server-only';
import type { RateLimitInput, RateLimitResult, RateLimitStore } from '@/lib/rate-limit/types';

/** Fixed windows anchored on the first attempt. Local development/tests only. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    private readonly clock: () => number = Date.now,
    private readonly maxEntries = 10_000
  ) {}

  async check({ key, limit, windowSeconds }: RateLimitInput): Promise<RateLimitResult> {
    const now = this.clock();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      // Expire, rather than evict, entries so capacity pressure cannot reset limits.
      for (const [storedKey, stored] of this.buckets) {
        if (stored.expiresAt <= now) this.buckets.delete(storedKey);
      }
      if (this.buckets.size >= this.maxEntries)
        throw new Error('Local rate-limit capacity reached.');
      bucket = { count: 0, expiresAt: now + windowSeconds * 1000 };
      this.buckets.set(key, bucket);
    }
    bucket.count = Math.min(bucket.count + 1, limit + 1);
    return {
      allowed: bucket.count <= limit,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: Math.ceil(bucket.expiresAt / 1000),
    };
  }
}
