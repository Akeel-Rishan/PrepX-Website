import 'server-only';
import type { RateLimitConfig } from '@/lib/rate-limit/config';
import { identifierRateLimitKey, ipRateLimitKey, resolveClientIp } from '@/lib/rate-limit/keys';
import type { RateLimitDecision, RateLimitResult, RateLimitStore } from '@/lib/rate-limit/types';

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
}

export function createResultSearchLimiter(
  config: RateLimitConfig,
  store: RateLimitStore,
  clock: () => number = Date.now
) {
  function blocked(result: RateLimitResult): RateLimitDecision {
    return {
      allowed: false,
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        'X-RateLimit-Remaining': '0',
        'Retry-After': String(Math.max(1, result.resetAt - Math.floor(clock() / 1000))),
      },
    };
  }

  return async (headers: Headers, body: unknown): Promise<RateLimitDecision> => {
    try {
      const ip = await store.check({
        key: `${ipRateLimitKey(resolveClientIp(headers, config), config.secret)}:${config.ipLimit}:${config.ipWindowSeconds}`,
        limit: config.ipLimit,
        windowSeconds: config.ipWindowSeconds,
      });
      if (!ip.allowed) return blocked(ip);
      const identifierKey = identifierRateLimitKey(body, config.secret);
      if (!identifierKey) return { allowed: true, headers: rateLimitHeaders(ip) };
      const identifier = await store.check({
        key: `${identifierKey}:${config.identifierLimit}:${config.identifierWindowSeconds}`,
        limit: config.identifierLimit,
        windowSeconds: config.identifierWindowSeconds,
      });
      if (!identifier.allowed) return blocked(identifier);
      // Describe whichever bucket has fewer attempts left; a 429 always
      // describes the bucket which actually blocked the request.
      return {
        allowed: true,
        headers: rateLimitHeaders(identifier.remaining <= ip.remaining ? identifier : ip),
      };
    } catch {
      if (config.failureMode === 'open') {
        console.warn('[Result Search Rate Limit] Provider failure; explicit emergency fail-open.');
        return { allowed: true, headers: {} };
      }
      console.error('[Result Search Rate Limit] Provider failure; request blocked.');
      return { allowed: false, status: 500, headers: {} };
    }
  };
}
