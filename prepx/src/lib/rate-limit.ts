import 'server-only';
import { readRateLimitConfig } from '@/lib/rate-limit/config';
import { MemoryRateLimitStore } from '@/lib/rate-limit/memory-store';
import { UpstashRateLimitStore } from '@/lib/rate-limit/upstash-store';
import { createResultSearchLimiter } from '@/lib/rate-limit/result-search';
import type { RateLimitDecision } from '@/lib/rate-limit/types';

let limiter: ReturnType<typeof createResultSearchLimiter> | undefined;

export async function checkResultSearchRateLimit(
  headers: Headers,
  body: unknown
): Promise<RateLimitDecision> {
  // Lazy initialization allows builds to succeed without production credentials;
  // missing/invalid deployment configuration still blocks every runtime request.
  if (!limiter) {
    try {
      const config = readRateLimitConfig();
      const store =
        config.provider === 'upstash'
          ? new UpstashRateLimitStore(config.redisUrl, config.redisToken, config.timeoutMs)
          : new MemoryRateLimitStore();
      limiter = createResultSearchLimiter(config, store);
    } catch {
      console.error('[Result Search Rate Limit] Invalid configuration; request blocked.');
      return { allowed: false, status: 500, headers: {} };
    }
  }
  return limiter(headers, body);
}
